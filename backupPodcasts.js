require('dotenv').config()

const AWS = require('aws-sdk')
const db = require('monk')(process.env.MONGO_DB)
const Throttle = require('promise-parallel-throttle')
const request = require('request')
const moment = require('moment')
const posts = db.get('posts')
const fs = require('fs')

const BUCKET_NAME = 'sd-profile-pictures'
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

const backupPodcasts = async (afterDate, episodeNumber = 0) => {
  const query = {
    mp3: { $exists: true },
  }

  const options = {
    limit: 100,
    sort: { date: 1 },
    fields: {
      _id: 1,
      date: 1,
      title: 1,
      backup: 1,
      mp3: 1,
    },
  }

  if (afterDate) {
    query.date = { $gt: afterDate }
  }

  const s3Options = { Bucket: BUCKET_NAME }
  const reply = await posts.find(query, options)
  console.log(`processing ${reply.length} posts`)

  if (!reply.length) {
    console.log('Processed all posts')
    db.close()
    return process.exit()
  }

  const queue = reply.map(post => {
    return async () => {
      const episodeTitle = post.title.rendered
        .replace(/[^a-zA-Z0-9\s]/ig, '')
        .replace(/\s/ig, '_')
      const fileName = `${episodeNumber}_${episodeTitle}.mp3`

      episodeNumber++
      afterDate = post.date

      if (post.backup) {
        console.log(`already backedup: ${fileName}`)
        return Promise.resolve()
      }

      console.log(`processing ${fileName}`)
      await new Promise((resolve, reject) => {
        request
          .get(post.mp3)
          .on('error', (err) => console.error('err ', err))
          .pipe(fs.createWriteStream(fileName))
          .on('close', resolve)
      })

      const fileContent = await fs.readFileSync(fileName)

      s3Options.Key = `normal-episodes/${fileName}`
      s3Options.Body = fileContent

      return await new Promise((resolve, reject) => {
        s3.upload(s3Options, async (err, data) => {
          if (err) {
            throw err
          }

          console.log(`File uploaded successfully: ${data.Location}`)

          await fs.unlinkSync(fileName)
          await posts.update(
            { _id: post._id },
            { $set: { backup: true } }
          )

          resolve()
        });
      })
    }
  })

  return Throttle.sync(queue).then(() => {
    backupPodcasts(afterDate, episodeNumber)
  })
}

backupPodcasts()
