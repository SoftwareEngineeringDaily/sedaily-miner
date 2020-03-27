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
    transcriptURL: { $regex: 'softwareengineeringdaily.com' },
    $or: [
      { transcript: { $exists: false } },
      { transcript: { $regex: /\[SPONSOR MESSAGE\]/ig } },
      { transcript: { $regex: '.</p><p>com' } }
    ],
  }

  const reply = await posts.find(query, options)
  const queue = reply.map(post => {
    return async () => {
      const spinner = ora({
        text: `Parsing ${post.transcriptURL}`,
        spinner: cliSpinners.bouncingBar,
      })

      try {
        spinner.start()
        const transcript = await parsePdf(post.transcriptURL)
        await posts.update({ id: post.id }, { $set: { transcript } })
        spinner.succeed(`[SUCCESS]: ${post.id} ${post.title.rendered} - ${post.transcriptURL}`)
      }
      catch (err) {
        spinner.fail(`ERROR: ${post.title.rendered} ${transcriptURL}: `, err)
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
