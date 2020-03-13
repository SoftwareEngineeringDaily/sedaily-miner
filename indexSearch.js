require('dotenv').config()

const keys = require('lodash/keys')
const db = require('monk')(process.env.MONGO_DB)
const querystring = require('querystring')
const algoliasearch = require('algoliasearch')
const Throttle = require('promise-parallel-throttle')
const striptags = require('striptags')
const moment = require('moment')
const posts = db.get('posts')
const threads = db.get('forumthreads')

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
);

const postsIndex = client.initIndex(
  process.env.ALGOLIA_POSTS_INDEX
);

const convertNumberCodes = (text) => {
  return text
    .replace(/&#8211;/g, ' — ')
    .replace(/&#8230;/g, '...')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
}

function prepSearchObj(obj) {
  const validKeys = [
    '_id',
    'id',
    'date',
    'date_gmt',
    'guid',
    'modified',
    'modified_gmt',
    'slug',
    'status',
    'type',
    'link',
    'title',
    'topics',
    'author',
    'excerpt',
    'score',
    'mp3',
    'thread',
    'filterTags',
    'transcriptURL',
    'featuredImage',
    'sponsors',
    'objectID',
  ]

  let _keys = keys(obj)
  let _obj = {
    objectID: obj.id,
    likeCount: obj.likeCount || 0,
  }

  // Provide a clean title
  if (obj.title && obj.title.rendered) {
    _obj._title = obj.title.rendered
  }

  // Provide a clean description
  if (obj.excerpt && obj.excerpt.rendered) {
    let description = obj.excerpt.rendered
      .replace(/<p[^>]*>Podcast:\s.+?<\/p>/g, '') // Remove download info
      .replace(/<a[^>]*>.+?<\/a>/g, '') // Remove links
      .replace(/http.{0,}Podcast: Play in new window \| Download\s/g, '') // Remove Podcast link from description
      .match(/<p[^>]*>.+?<\/p>/g) // Seperate paragraphs

    _obj.description = convertNumberCodes((description.length > 0) ? description[0] : '')
    _obj.description = _obj.description.replace(/<p[^>]*>|<\/p>/g, '')
  }

  // Trim Content
  if (obj.content && obj.content.rendered) {
    _obj.content = {
      rendered: obj.content.rendered.slice(0, 512)
    }
  }

  if (obj.date) {
    _obj.date = moment(obj.date).toDate()
    _obj.date_timestamp = new Date(obj.date).getTime()
  }

  _keys.forEach(key => {
    if (validKeys.indexOf(key) >= 0) {
      _obj[key] = obj[key]
    }
  })

  return _obj
}

const indexSearch = () => {
  let query = { search_index: { $exists: false } }
  let options = {}

  posts
    .find(query, options)
    .then((reply) => {
      const queue = reply.map(post => {
        return async () => {
          let _post = prepSearchObj(post)
          let thread = _post.thread ? await threads.findOne(_post.thread) : { commentsCount: 0 }

          _post.thread = {
            _id: _post.thread,
            commentsCount: thread.commentsCount || 0,
          }

          console.log('indexing ', _post.id, _post.date_timestamp)
          return await postsIndex
            .saveObject(_post)
            .then(async ({ objectID: search_index }) => {
              return await posts.update({ id: _post.id }, { $set: { search_index } })
            })
        }
      })

      return Throttle.all(queue).then(() => {
        console.log('Processed all posts')
        db.close()
        process.exit()
      })
    })
    .catch((err) => {
      console.error('Error indexing ', err)
    })
}

indexSearch()
