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
    'author',
    'score',
    'mp3',
    'thread',
    'filterTags',
    'transcriptUrl',
    'featuredImage',
    'sponsors',
    'objectID',
  ]

  let _keys = keys(obj)
  let _obj = {
    objectID: obj.id
  }

  if (obj.title && obj.title.rendered) {
    _obj._title = obj.title.rendered
  }

  if (obj.content && obj.content.rendered) {
    _obj.content = {
      rendered: striptags(obj.content.rendered).slice(0, 256)
    }
  }

  if (obj.date) {
    _obj.date = moment(_obj.date).toDate()
  }

  _keys.forEach(key => {
    if (validKeys.indexOf(key) >= 0) {
      _obj[key] = obj[key]
    }
  })

  return _obj
}

const indexSearch = () => {
  let query = {}
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

          console.log('indexing ', _post._title)
          return await postsIndex.saveObject(_post)
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
