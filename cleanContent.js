require('dotenv').config()

const Parser = require('node-html-parser')
const Throttle = require('promise-parallel-throttle')
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')

const getContent = async () => {
  const options = {}
  const query = {
    $or: [
      { content: { $exists: true } },
      { cleanedContent: { $exists: true } },
    ]
  }

  const reply = await posts.find(query, options)
  const queue = reply.map(post => {
    return async () => {
      const parsed = Parser.parse(post.cleanedContent || post.content.rendered)
      const elements = parsed.querySelectorAll('*')
      const toRemove = []

      elements.forEach((el, i) => {
        // Remove sponsorship inquiries
        if (el && el.text.toLowerCase().indexOf('sponsorship inquiries:') >= 0) {
          elements[i] = null
        }

        // Remove announcements
        if (el && el.text.toLowerCase() === 'announcements') {
          elements[i] = null

          if (elements[i + 1].tagName === 'p') {
            elements[i + 1] = null
          }

          if (!elements[i + 2] || (elements[i + 2] && elements[i + 2].tagName === 'ul')) {
            elements[i + 2] = null
          }

          if (elements[i + 3] && elements[i + 3].tagName === 'ul') {
            elements[i + 3] = null
          }
        }
      })

      const cleanedContent = elements
        .map(el => el && el.toString())
        .filter(el => !!(el))
        .join('')

      try {
        console.log(`[SUCCESS]: ${post.id}: ${post.title.rendered}`)
        await posts.update({ id: post.id }, { $set: { cleanedContent } })
      }
      catch (err) {
        console.error(`ERROR: ${post.id}: ${post.title.rendered}: `, err)
      }

      return Promise.resolve()
    }
  })

  Throttle.all(queue).then(() => {
    console.log('Cleaned up all content')
    db.close()
    process.exit()
  })
}

getContent()
