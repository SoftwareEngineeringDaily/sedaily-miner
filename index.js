require('dotenv').config()

const keys = require('lodash/keys')
const isArray = require('lodash/isArray')
const db = require('monk')(process.env.MONGO_DB)
const rp = require('request-promise')
const querystring = require('querystring')
const Throttle = require('promise-parallel-throttle')
const fs = require('fs')
const posts = db.get('posts')
const tags = db.get('tags')
const moment = require('moment')
const striptags = require('striptags')
const parsePdf2 = require('./parsePdf2')
const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('SED miner')
})

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

const WPAPI = require('wpapi')
const wp = new WPAPI({ endpoint: 'http://softwareengineeringdaily.com/wp-json/wp/v2/posts' })

function findAdd(post) {
  return posts.findOne({ id: post.id })
    .then(async (postFound) => {

      if (!postFound) {
        console.log('new post!')
        return posts.insert(post)
      }
      // Handles previously stored posts
      else if (postFound && postFound.transcriptURL && !postFound.transcript) {
        console.log('setting transcript')
        let transcript = await parsePdf2(postFound.transcriptURL)
        return posts.update(
          { _id: postFound._id },
          { $set: { transcript } }
        )
      }

      return
    })
}

function getPosts(page) {

  query.page = page;
  wpQueryString = querystring.stringify(query);

  return rp(`https://softwareengineeringdaily.com/wp-json/wp/v2/posts?${wpQueryString}`)
    .then(function (response) {
      let promises = [];
      let postsResponse = JSON.parse(response);
      const queue = postsResponse.map(post => {
        return async () => {
          post.date = moment(post.date).toDate()
          return await findAdd(post)
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

app.listen(process.env.PORT || 8080)