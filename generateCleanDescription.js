require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const getUrls = require('get-urls');
const Bluebird = require('bluebird');
const rp = require('request-promise');
const async = require('async');

var processingPosts = true;
const CONCURRENCY = 5;
var q = async.queue(function(post, callback) {
  console.log('starting', post.id)
  let oldContent =  post.content.rendered;
  let urls = getUrls(post.content.rendered);
  let values = urls.values();
  let mp3 = '';
  let mainImage = '';

  if (oldContent) {
    const splitContent = oldContent.split('Download</a></p>')
    if (splitContent.length == 2) {
      const cleanedContent = splitContent[1];
      posts.update({id: post.id}, {
        $set: {
          cleanedContent
        }
      })
      callback();
    } else {
       console.log(post._id);
       callback();
    }
  } else {
     console.log(post._id);
     callback()
  }
}, CONCURRENCY);

q.drain = function() {
  // tasks may finish faster than added to queue, need to wait
  if (!processingPosts) {
    console.log('all items have been processed');
    db.close();
  }
};

let promises = [];
posts.find( {cleanedContent: {$exists: false}})
  .each((post) => {
    q.push(post, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log('finished processing', post.id);
      }
    });
  })
  .then(() => {
    processingPosts = false;
  })
