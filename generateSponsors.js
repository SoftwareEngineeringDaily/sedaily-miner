require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const rp = require("request-promise");
const moment = require("moment");
const async = require('async');
const request = require("request");

const SET_NULL_AFTER_DAYS = 30; // The number of days after script sets transcript URL to null if not set yet
let counter = 0
const CONCURRENCY = 5;

var q = async.queue(function(post, callback) {
  date_now = moment.utc();
  request({
    uri: post.link,
  }, function(error, response, body) {
    try {
      let sponsorsContent = null
      sponsorsContent = body.split('<h3>Sponsors</h3>')

      if (sponsorsContent) {
        if (sponsorsContent.length == 2) {

          sponsors = sponsorsContent[1].trim();
          sponsorsNoWhiteSpaces = sponsors.replace(/\>\s+\</g,'><')
          let sponsorsCut = sponsorsNoWhiteSpaces.split('</div></div><div class="col-xs-12 col-md-6 col-lg-3">')
          sponsorsContent = sponsorsCut[0];

          posts.update({id: post.id}, {
            $set: {
              "sponsorsContent": sponsorsContent
            },
          })
          .then((result) => {
            console.log('success updating', post.title["rendered"]);
            counter ++
            callback();
          })
          .catch((error) => {
            callback(error);
          })
          // console.log("Add sponsors to: ", post.title["rendered"]);
        } else {
          time_diff = date_now.diff(moment(post.date), 'days')
          if (time_diff > SET_NULL_AFTER_DAYS) {
            posts.update({id: post.id}, {
              $set: {
                "sponsorsContent": null
              },
            })
            .then((result) => {
              counter ++
              console.log('Update null to: ', post.title["rendered"]);
              callback();
            })
            .catch((error) => {
              callback(error);
            })
          } else {
            console.log('No sponsors for:', post.title["rendered"])
            callback();
          }
        }
      } else {
        counter ++
        console.log('No sponsors for:', post.title["rendered"])
        callback();
      }

    } catch (e) {
        console.log(e);
        callback();
    }

  });
}, CONCURRENCY);

q.drain = function() {
  console.log('all items have been processed');
  db.close();
};
let progress = 0
posts.count( {sponsorsContent: {$exists: false}})
.then((c) => {
  if (c > 0) {
    posts.find( {sponsorsContent: {$exists: false}})
      .each((post) => {
        q.push(post, function (err) {
          if (err) {
            console.log(err);
          } else {
            progress = Math.round((counter/c)*100)
            console.log("PROGRESS: " + progress + "%");
          }
        });
      })
  } else {
    console.log("All posts updated.");
    process.exit();
  }
})
