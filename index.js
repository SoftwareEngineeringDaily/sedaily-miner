require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const rp = require('request-promise');
const querystring = require('querystring');
const fs = require('fs');
const posts = db.get('posts')
const tags = db.get('tags')
const Bluebird = require('bluebird');
const moment = require('moment');

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
let query = {
  per_page: 100,
};
let wpQueryString = querystring.stringify(query);

const WPAPI = require( 'wpapi' );
const wp = new WPAPI({ endpoint: 'http://softwareengineeringdaily.com/wp-json/wp/v2/posts' });

// NOTE: page 1 is the latest podcasts:
let page = 1;

function findAdd(post) {
  return posts.findOne({id: post.id})
    .then((postFound) => {
      if (!postFound) {
        console.log("new post!")
        return posts.insert(post);
      } else {
         console.log('post exists already', post.id);
      }

      return;
    })
}

function getPosts(page) {

  query.page = page;
  wpQueryString = querystring.stringify(query);

  rp(`http://softwareengineeringdaily.com/wp-json/wp/v2/posts?${wpQueryString}`)
    .then(function (response) {
      let promises = [];

      let postsResponse = JSON.parse(response);
      console.log(postsResponse.length)
      if (postsResponse.length === 0) return false;
      for (let post of postsResponse) {
        post.date = moment(post.date).toDate();
        // let updatePromise = posts.update({id: post.id}, post, {upsert: true});
        promises.push(findAdd(post));
      }

      return Bluebird.all(promises);
    })
    .then((result) => {
      if (!result) {
        console.log('Done and closing db connection!');
        db.close();
        process.exit();
	      return;
      };

      page += 1;console.log('page', page)
      getPosts(page)
    })
    .catch(function (err) {
      console.log('ERROR', err);
      process.exit();
    });
}

getPosts(page);
