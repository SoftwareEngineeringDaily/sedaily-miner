require('dotenv').config()

const keys = require('lodash/keys')
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const rp = require('request-promise')
const moment = require('moment')
const async = require('async')
const request = require('request')
const jsdom = require('jsdom');
const { JSDOM } = jsdom
const SET_NULL_AFTER_DAYS = 30 // The number of days after script sets transcript URL to null if not set yet
const CONCURRENCY = 5

let counter = 0
let q = async.queue(function(post, callback) {
  date_now = moment.utc();
  request({
    uri: post.link,
  }, function(error, response, body) {
    try {

      let sponsorsContent = body.split('<h3>Sponsors</h3>')
      let _sponsors = []
      let sponsorImageEls = []
      let sponsorImageKeys = []
      let dom

      if (sponsorsContent.length == 1) {
        sponsorsContent = body.split('<h2>Sponsors</h2>')
      }

      if (sponsorsContent.length == 2) {

        let sponsors = sponsorsContent[1].trim()
        sponsorsNoWhiteSpaces = sponsors.replace(/\>\s+\</g,'><')
        let sponsorsCut = sponsorsNoWhiteSpaces.split('</div></div><div class="col-xs-12 col-md-6 col-lg-3">')
        sponsorsContent = sponsorsCut[0]

        // Parse sponsor data
        dom = new JSDOM(sponsorsContent)
        sponsorImageEls = dom.window.document.querySelectorAll('img')
        sponsorImageKeys = keys(sponsorImageEls)
        sponsors = sponsorImageKeys.map(imageKey => {
          let img = sponsorImageEls[imageKey]
          let imageSrc = img.getAttribute('src') || ''

          return {
            image: imageSrc.split('?')[0],
            url: img.parentElement.getAttribute('href') || '',
          }
        })

        posts.update({id: post.id}, {
          $set: {
            sponsorsContent,
            sponsors,
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
          // Posts without sponsors but younger than 30 days:
          console.log('Skipped post without sponsors, younger than 30 days:', post.title["rendered"])
          callback();
        }
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
posts.count({ sponsors: { $exists: false } })
.then((c) => {
  if (c > 0) {
    posts.find({ sponsors: { $exists: false } })
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
