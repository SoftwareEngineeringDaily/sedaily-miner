require('dotenv').config()

const keys = require('lodash/keys')
const isArray = require('lodash/isArray')
const db = require('monk')(process.env.MONGO_DB)
const rp = require('request-promise')
const querystring = require('querystring')
const algoliasearch = require('algoliasearch')
const Throttle = require('promise-parallel-throttle')
const fs = require('fs')
const posts = db.get('posts')
const tags = db.get('tags')
const moment = require('moment')
const striptags = require('striptags')
const parsePdf = require('./parsePdf')

// @TODO: can we query by modified date? https://github.com/WP-API/WP-API/issues/472
// let query = {
//   date_query: [
//     {
//       'column'    : 'post_modified',
//       'after'     : new Date(),
//       'inclusive' : false
//     }
//   ]
// }
//
//

// NOTE: page 1 is the latest podcasts:
let page = 1
let per_page = 100
let query = {
  per_page,
}
let wpQueryString = querystring.stringify(query)

const WPAPI = require('wpapi');
const wp = new WPAPI({ endpoint: 'http://softwareengineeringdaily.com/wp-json/wp/v2/posts' });
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
    'modified',
    'slug',
    'status',
    'type',
    'link',
    'featured_media',
    'search_index',
    'objectID',
  ]

  let _keys = keys(obj)
  let _obj = {}

  if (obj.title && obj.title.rendered) {
    _obj.title = obj.title.rendered
  }

  if (obj.content && obj.content.rendered) {
    _obj.content = striptags(obj.content.rendered)
  }

  _keys.forEach(key => {
    if (validKeys.indexOf(key) >= 0) {
      _obj[key] = obj[key]
    }
  })

  return _obj
}

function findAdd(post) {
  return posts.findOne({id: post.id})
    .then(async (postFound) => {

      if (!postFound) {
        console.log('new post!');
        postsIndex.addObjects([ prepSearchObj(post) ], async (err, content) => {
          post.search_index = content ? content.objectIDs : null;

          let _post = await posts.insert(post);

          // Update search with `_id`
          if (_post.search_index && isArray(_post.search_index)) {
            _post.objectID = _post.search_index[0];
            return postsIndex.saveObjects([ prepSearchObj(_post) ], async (err, content) => {
              return;
            })
          }

          return;
        });
      }
      else if (post.slug && process.env.REINDEX === 'true') {
        console.log('post exists already');
        if (postFound.search_index && isArray(postFound.search_index)) {
          post.objectID = postFound.search_index[0];
        }

        if (postFound._id) {
          post._id = postFound._id
        }

        return postsIndex[post.objectID ? 'saveObjects' : 'addObjects']([ prepSearchObj(post) ], (err, content) => {
          return posts.update(
            { _id: postFound._id },
            {
              $set: {
                search_index: content ? content.objectIDs : post.search_index ? post.search_index : null
              }
            }
           );
        });
      }
      else if (postFound && postFound.transcriptUrl && !postFound.transcript) {
        console.log('setting transcript')
        let transcript = await parsePdf(postFound.transcriptUrl)
        return posts.update(
          { _id: postFound._id },
          { $set: { transcript } }
        )
      }

      return;
    })
}

function getPosts(page) {

  query.page = page;
  wpQueryString = querystring.stringify(query);

  return rp(`http://softwareengineeringdaily.com/wp-json/wp/v2/posts?${wpQueryString}`)
    .then(function (response) {
      let promises = [];
      let postsResponse = JSON.parse(response);
      console.log(postsResponse.length, 'Wordpress posts returned')

      const queue = postsResponse.map(post => {
        return async () => {
          post.date = moment(post.date).toDate()
          await findAdd(post)
        }
      })

      return Throttle.all(queue);
    })
    .then((result) => {
      if (!result) {
        console.log('Done and closing db connection!');
        db.close();
        process.exit();
	      return;
      };

      page += 1;
      console.log('page', page)
      return getPosts(page);
    })
    .catch(function (err) {
      if (err.message.indexOf('rest_post_invalid_page_number') > -1) {
        console.log('Processed all Wordpress posts')
        db.close();
        process.exit();
      } else {
        console.log('ERROR', err)
        process.exit(1)
      }
    });
}

getPosts(page)
