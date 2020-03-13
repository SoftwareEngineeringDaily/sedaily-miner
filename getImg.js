require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const getUrls = require('get-urls');
const Bluebird = require('bluebird');
const rp = require('request-promise');
const async = require('async');

const CONCURRENCY = 5;
const q = async.queue(function(post, callback) {
  console.log('starting', post.id)
  rp(post._links['wp:featuredmedia'][0].href)
    .then((result) => {
      const json = JSON.parse(result);

      if (!json.guid.rendered) {
        return callback();
      }

      const featuredImage = json.guid.rendered.replace('http://', 'https://');
      console.log(featuredImage)
      posts.update({ id: post.id }, {
        $set: {
          featuredImage,
        },
      })
      .then(() => {
        callback();
      })
    })
    .catch((error) => {
      callback(error);
    })
}, CONCURRENCY);

q.drain = function() {
  console.log('all items have been processed');
  db.close();
};

let promises = [];

posts
  .find({
    $or: [
      { featuredImage: { $exists: false } },
      { featuredImage: { $regex: 'http://' } },
    ]
  })
  .each((post) => {
    if (!post._links['wp:featuredmedia']) {
      console.log('no featuredmedia', post.id)
      return;
    }

    q.push(post, function (err) {
      if (err) {
        console.log(err.message);
      } else {
        console.log('finished processing', post.id);
      }
    });
  })
