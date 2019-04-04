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

// NOTE: page 1 is the latest podcasts:
let page = 1;
let per_page = 100
let query = {
  per_page,
};
let wpQueryString = querystring.stringify(query);

const WPAPI = require( 'wpapi' );
const wp = new WPAPI({ endpoint: 'http://softwareengineeringdaily.com/wp-json/wp/v2/posts' });

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
      console.log(postsResponse.length, 'Wordpress posts returned')
      for (let post of postsResponse) {
        post.date = moment(post.date).toDate();
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

      page += 1;
      console.log('page', page)
      getPosts(page)
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

getPosts(page);
