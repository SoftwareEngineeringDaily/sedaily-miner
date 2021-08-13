require('dotenv').config()

const db = require('monk')(process.env.MONGO_DB)
const rp = require('request-promise')
const querystring = require('querystring')
const Throttle = require('promise-parallel-throttle')
const posts = db.get('posts')
const moment = require('moment')
const parsePdf2 = require('./parsePdf2')

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
const per_page = 100
const query = {
  per_page,
}

let wpQueryString = querystring.stringify(query)

const WPAPI = require('wpapi')
const wp = new WPAPI({ endpoint: 'http://softwareengineeringdaily.com/wp-json/wp/v2/posts' })

async function findAdd(post) {
    // fetch post by id
    const postFound = await posts.findOne({ id: post.id });

    // if post not exist insert new
    if (!postFound) {
      console.log('new post!')
      return posts.insert(post)
    } 
    // Handles previously stored posts
    else if (postFound && postFound.transcriptURL && !postFound.transcript) {
      console.log('setting transcript')
      const transcript = await parsePdf2(postFound.transcriptURL)
      return posts.update(
        { _id: postFound._id },
        { $set: { transcript } }
      )
    }
    return
}

async function getPosts(page) {

  query.page = page;
  wpQueryString = querystring.stringify(query);

  try {
    const response = await rp(`https://softwareengineeringdaily.com/wp-json/wp/v2/posts?${wpQueryString}`);
    let postsResponse = JSON.parse(response);
    console.log(postsResponse.length, 'Wordpress posts returned')

    const queue = postsResponse.map(post => {
      return async () => {
        post.date = moment(post.date).toDate()
        return await findAdd(post)
      }
    })

    const result = Throttle.all(queue);

    if (!result) {
      console.log('Done and closing db connection!');
      db.close();
      process.exit();
    };

    page += 1;
    console.log('page', page)
    return getPosts(page);
  } 
  catch(err) {
    if (err.message.indexOf('rest_post_invalid_page_number') > -1) {
      console.log('Processed all Wordpress posts')
      db.close();
      process.exit();
    } 
    else {
      console.log('ERROR', err)
      process.exit(1)
    }
  } 
}

getPosts(page)
