require('dotenv').config()

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
      { transcript: { $regex: '© 2020 Software Engineering Daily' } },
    ],
  }

  const reply = await posts.find(query, options)
  const queue = reply.map(post => {
    return async () => {
      try {
        const transcript = await parsePdf(post.transcriptURL)
        console.log(`[SUCCESS]: ${post.id} ${post.title.rendered} - ${post.transcriptURL} `, !!(transcript))
        await posts.update({ id: post.id }, { $set: { transcript } })
      }
      catch (err) {
        console.error(`ERROR: ${post.title.rendered} ${transcriptURL}: `, err)
      }

      return Promise.resolve()
    }
  })

  Throttle.all(queue).then(() => {
    console.log('Processed all transcripts')
    db.close()
    process.exit()
  })
}

getTranscript()
