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

const backupPodcasts = async () => {
  const query = {
    mp3: { $exists: true },
    transcriptURL: { $type: 2 },
    // date: {
    //   $gte: new Date(moment().subtract(1, 'days').toDate()),
    // },
  }

  const options = {}
  const s3Options = { Bucket: BUCKET_NAME }
  const reply = await posts.find(query, options)
  const queue = reply.map(post => {
    return async () => {
      const pathParts = post.transcriptURL.split('/')
      const fileName = pathParts[pathParts.length - 1]
        .replace('.pdf', '.mp3')
        .replace('-', '_')

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

          resolve()
        });
      })
    }
  })

  return Throttle.all(queue).then(() => {
    console.log('Processed all posts')
    db.close()
    process.exit()
  })
}

backupPodcasts()
