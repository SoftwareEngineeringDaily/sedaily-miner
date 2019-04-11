require('dotenv').config()
const HTML = require('html-parse-stringify');
const _ =require('lodash');
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const Bluebird = require('bluebird');
const getUrls = require('get-urls');
const rp = require("request-promise");
const moment = require("moment");
const async = require('async');
const request = require("request");

const SET_NULL_AFTER_DAYS = 30; // The number of days after script sets transcript URL to null if not set yet

let promises = [];
let postsCount = 0;
posts.find({sponsorsContent: {$exists: false}}, { stream: false })
  .each((post) => {
    postsCount++

    date_now = moment.utc();

    let requestPromise = rp(post.link)
    .then(async function(body) {
      let sponsorsContent = body.split('<h3>Sponsors</h3>')

      if (sponsorsContent.length == 2) {
        sponsors = sponsorsContent[1].trim();
        sponsorsNoWhiteSpaces = sponsors.replace(/\>\s+\</g,'><')
        let sponsorsCut = sponsorsNoWhiteSpaces.split('</div></div><div class="col-xs-12 col-md-6 col-lg-3">')
        sponsorsContent = sponsorsCut[0];

        await posts.update({id: post.id}, {
          $set: {
            "sponsorsContent": sponsorsContent
          },
        })
        console.log("Add sponsors to: ", post.title["rendered"]);
      } else {
        time_diff = date_now.diff(moment(post.date), 'days')
        if (time_diff > SET_NULL_AFTER_DAYS) {
          await posts.update({id: post.id}, {
            $set: {
              "sponsorsContent": null
            },
          })
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
    console.log("done");
    process.exit();
  })
  .catch((error) => { console.log(error); })
