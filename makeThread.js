require('dotenv').config()
const monk = require('monk');
const db = require('monk')(process.env.MONGO_DB);
const rp = require('request-promise');
const threads = db.get('forumthreads')
const posts = db.get('posts')
const Bluebird = require('bluebird');
const moment = require('moment');



function createThreadForPodcastEpisode(post, successCallback) {
  // Make sure thread doesn't exist already:
  threads.findOne({podcastEpisode: post._id}).then((thread) => {
    if (!thread) {
      console.log('No forum thread for this podcast exists. Good to continue.');

      const date = moment(post.date).toDate()
      threads.insert({
        title: 'Discuss: ' + post.title.rendered,
        content: ' ',
        author: monk.id(process.env.THREAD_AUTHOR_ID),
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
      console.log('!!!!!! Thread for post exists already:', thread);
      // TODO: associate forum thread to post:
    }
  }).catch((e) => {
    console.log('error', e);
  })


}

// XXX: This removes forum from episode model:
posts.find( {thread: {$exists: true}})
.each ((post) => {
  posts.update({_id: post._id}, {$unset: {
    thread: 1
  }}).then((result) => {
    console.log('removed')
  }).catch((e) => { console.log('error restting thread', e)})
});


/*
posts.find( {thread: {$exists: false}})
  .each ((_post) => {
    (function(post){
      createThreadForPodcastEpisode(post, (thread) => {
        posts.update({_id: post._id}, {$set: {
          thread: monk.id(thread._id),
        }}).then((updatedPost) => {

        }).catch((e) => {
          console.log('error setting thread', post, thread);
        })
      });
    })(_post)

  });
  */
