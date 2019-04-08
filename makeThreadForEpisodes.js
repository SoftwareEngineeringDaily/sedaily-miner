require('dotenv').config()
const monk = require('monk');
const db = require('monk')(process.env.MONGO_DB);
const rp = require('request-promise');
const threads = db.get('forumthreads')
const posts = db.get('posts')
const Bluebird = require('bluebird');
const moment = require('moment');
var colors = require('colors/safe');
const users = db.get('users')
const async = require('async');

var processingPosts = false;
const CONCURRENCY = 5;
var q = async.queue(function(data, callback) {
  var post = data.post;
  var user = data.user;
  console.log('creating thread for podcast episode', post.id)
  threads.findOne({podcastEpisode: post._id}).then((thread) => {
    if (!thread) {
      console.log('No forum thread for this podcast exists. Good to continue.');
      const date = moment(post.date).toDate()
      threads.insert({
        title: 'Discuss: ' + post.title.rendered,
        content: ' ',
        author: monk.id(user._id),
        podcastEpisode: monk.id(post._id),
        score: 0 ,
        // __v: 0,
        deleted: false,
        commentsCount: 0,
        dateCreated: date,
        dateLastAcitiy: date,
      })
      .then((thread) => {
        return posts.update({_id: post._id}, {$set: {
          thread: monk.id(thread._id),
        }})
      })
      .then((updatedPost) => {
        console.log(updatedPost)
        callback();
      })
      .catch((e) => {
        callback(e);
      })
    } else {
      console.log('Thread for post exists already:', thread._id);
      callback();
      // TODO: associate forum thread to post:
    }
  });
}, CONCURRENCY);

q.drain = function() {
  // tasks may finish faster than added to queue, need to wait
  if (!processingPosts) {
    console.log('all items have been processed');
    db.close();
  }
};

function createThreadForPodcastEpisode(user, post, successCallback) {
  // Make sure thread doesn't exist already:
  console.log('creating thread for podcast episode', post.id)
  threads.findOne({podcastEpisode: post._id}).then((thread) => {
    if (!thread) {
      console.log('No forum thread for this podcast exists. Good to continue.');

      const date = moment(post.date).toDate()
      threads.insert({
        title: 'Discuss: ' + post.title.rendered,
        content: ' ',
        author: monk.id(user._id),
        podcastEpisode: monk.id(post._id),
        score: 0 ,
        // __v: 0,
        deleted: false,
        commentsCount: 0,
        dateCreated: date,
        dateLastAcitiy: date,
      }).then( (thread) => {
        successCallback(thread);
      }).catch((e) => {
        console.log('error', e);
      })
    } else {
      console.log('Thread for post exists already:', thread._id);
      // TODO: associate forum thread to post:
    }
  }).catch((e) => {
    console.log('error', e);
  })
}


const forumAdminEmail  = process.env.FORUM_ADMIN_EMAIL ? process.env.FORUM_ADMIN_EMAIL : 'contact@softwaredaily.com';

users.findOne({email: forumAdminEmail}).then((user) => {
  if(!user) {
    console.log(colors.red('Forum user not created yet.'));
  } else {
    posts.find( {thread: {$exists: false}})
    .each((post) => {
      processingPosts = true;
      q.push({post, user}, function (err, result) {
        if (err) {
          console.log(err);
        } else {
          console.log('finished processing', post.id)
        }
      })
    }).then(() => {
      if (processingPosts) {
        processingPosts = false;
      } else {
        console.log('All posts have threads already.')
        q.kill();
        db.close();
      }
    })
  }
});
