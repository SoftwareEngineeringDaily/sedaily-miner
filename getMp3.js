require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const getUrls = require('get-urls');
const Bluebird = require('bluebird');
const rp = require('request-promise');
const request = require("request");

let promises = [];
posts.find( {mp3: {$exists: false}})
  .each((post) => {

    request({
      uri: post.link,
    }, function(error, response, body) {
      const urls = getUrls(body);

      let values = urls.values();
      var mp3 = null;
      for (let url of values) {
        let extension = url.substr(url.length - 4);

        if (extension === '.mp3' && url.indexOf('libsyn.com/sedaily') >= 0) {
          mp3 = url;
          break;
        }
      }

      if (mp3) {
         posts.update({id: post.id}, {
          $set: {
            mp3,
          },
        })
        .then((result) => { console.log('sucess updating', mp3); })
        .catch((error) => { console.log(error); })
      }
    });
  })
  .catch((error) => { console.log(error); })
