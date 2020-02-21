/*
  Script to find translateURL from cleanedContent for each post and
  add this to the post in the database.
*/

require('dotenv').config()

const HTML = require('html-parse-stringify')
const _ =require('lodash')
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const Bluebird = require('bluebird')
const getUrls = require('get-urls')
const rp = require('request-promise')
const moment = require('moment')
const parsePdf = require('./parsePdf')

const SET_NULL_AFTER_DAYS = 30; // The number of days after script sets transcript URL to null if not set yet

let promises = [];
let postsCount = 0;
posts.find({transcriptURL: {$exists: false}})
  .each((post) => {
    postsCount++

    date_now = moment.utc();

    let requestPromise = rp(post.link)
    .then(async function(body) {
      const urls = getUrls(body);
      let values = urls.values();
      let transcriptURL = null;

      for (let url of values) {
        let extension = url.substr(url.length - 4);

        if (extension === '.pdf') {
          transcriptURL = url;
          console.log('transcriptURL ', transcriptURL);
          await posts.update(
            { id: post.id },
            { $set: { transcriptURL } }
          )

          break;
        }
      }

      if (!transcriptURL) {
        time_diff = date_now.diff(moment(post.date), 'days')
        if (time_diff > SET_NULL_AFTER_DAYS) {
          await posts.update({id: post.id}, {
            $set: {
              "transcriptURL": null
            },
          });
        }
      }
    })
    .catch((error) => {
      if (error.statusCode !== 429 && error.statusCode !== 504) {
        console.log('Error', error)
      }
    })

    promises.push(requestPromise);
    console.log(postsCount);
  })
  .then(() => {
    console.log('BLUEBIRD')
    return Bluebird.all(promises);
  })
  .then(() => {
    console.log('done');
    process.exit();
  })
  .catch((error) => { console.log(error); })
