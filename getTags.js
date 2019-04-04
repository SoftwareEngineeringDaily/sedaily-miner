require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const tags = db.get('tags')
const Bluebird = require('bluebird');
const moment = require('moment');
const rp = require('request-promise');
const querystring = require('querystring');
const fs = require('fs');

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

let page = 1;

function getTags(page) {

  query.page = page;
  wpQueryString = querystring.stringify(query);

  rp(`http://softwareengineeringdaily.com/wp-json/wp/v2/tags?${wpQueryString}`)
    .then(function (response) {
      let promises = [];

      let tagsResponse = JSON.parse(response);
      console.log(tagsResponse.length)
      if (tagsResponse.length === 0) return false;
      for (let tag of tagsResponse) {
        let updatePromise = tags.update({id: tag.id}, tag, {upsert: true});
        promises.push(updatePromise);
      }

      return Bluebird.all(promises);
    })
    .then((result) => {
      if (!result) {
        db.close();
        return;
      };

      page += 1;
      console.log(page);
      getTags(page);
    })
    .catch(function (err) {
      console.log(err)
    });
}

getTags(page);
