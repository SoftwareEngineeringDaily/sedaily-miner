require('dotenv').config()

const Entities = require('html-entities').AllHtmlEntities
const Parser = require('node-html-parser')
const Throttle = require('promise-parallel-throttle')
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')

const entities = new Entities()

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

      let description = ""

      elements.forEach((el, i) => {
        // Create a clean podcast description
        if (
          el.tagName === 'p' &&
          el.text.trim() &&
          !el.text.match('Podcast: Play in new window | Download') &&
          !el.text.match('Sponsorship inquiries')
        ) {
          description += el.toString();
        }

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

      const title = {
        rendered: entities.decode(post.title.rendered)
      }

      const cleanedContent = elements
        .map(el => el && el.toString())
        .filter(el => !!(el))
        .join('')

      try {
        console.log(`[SUCCESS]: ${post.id}: ${post.title.rendered}`)
        await posts.update({ id: post.id }, { $set: { title, cleanedContent, description } })
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
