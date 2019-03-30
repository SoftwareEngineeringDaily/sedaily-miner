/*
  Script to find translateURL from cleanedContent for each post and
  add this to the post in the database.
*/

require('dotenv').config()
const HTML = require('html-parse-stringify');
const _ =require('lodash');
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const Bluebird = require('bluebird');
const getUrls = require('get-urls');
const request = require("request");

let promises = [];
let postsCount = 0
posts.find({transcriptURL: {$exists: false}})
  .each((post) => {
    postsCount++

    request({
      uri: post.link,
    }, function(error, response, body) {
      const urls = getUrls(body);
      let values = urls.values();

      var transcriptURL = null;
      for (let url of values) {
        let extension = url.substr(url.length - 4);

        if (extension === '.pdf') {
          transcriptURL = url;
          console.log(transcriptURL);

          return posts.update({id: post.id}, {
            $set: {
              "transcriptURL": transcriptURL
            },
          });
          break;
        }
      }

      if (!transcriptURL) {
        return posts.update({id: post.id}, {
          $set: {
            "transcriptURL": null
          },
        });
      }
    });
    console.log(postsCount);
  })
  .catch((error) => { console.log(error); })
