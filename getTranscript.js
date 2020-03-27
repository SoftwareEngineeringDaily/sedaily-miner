require('dotenv').config()

const ora = require('ora')
const cliSpinners = require('cli-spinners')
const Throttle = require('promise-parallel-throttle')
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const parsePdf = require('./parsePdf')

const getTranscript = async () => {
  const options = {}
  const query = {
    transcriptUrl: { $regex: 'softwareengineeringdaily.com' },
    transcriptURL: { $regex: 'softwareengineeringdaily.com' },
    $or: [
      { transcript: { $exists: false } },
      { transcript: { $regex: /\[SPONSOR MESSAGE\]/ig } },
    ],
  }

  const reply = await posts.find(query, options)
  const queue = reply.map(post => {
    return async () => {
      const spinner = ora({
        text: `Parsing ${post.transcriptUrl}`,
        spinner: cliSpinners.bouncingBar,
      })

      try {
        spinner.start()
        const transcript = await parsePdf(post.transcriptUrl)
        await posts.update({ id: post.id }, { $set: { transcript } })
        spinner.succeed(`[SUCCESS]: ${post.id} ${post.title.rendered} - ${post.transcriptUrl}`)
      }
      catch (err) {
        spinner.fail(`ERROR: ${post.title.rendered} ${transcriptUrl}: `, err)
      }

      return Promise.resolve()
    }
  })

  Throttle.sync(queue).then(() => {
    console.log('Processed all transcripts')
    db.close()
    process.exit()
  })
}

getTranscript()
