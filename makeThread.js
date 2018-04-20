require('dotenv').config()
const monk = require('monk');
const db = require('monk')(process.env.MONGO_DB);
const rp = require('request-promise');
const threads = db.get('forumthreads')
const posts = db.get('posts')
const Bluebird = require('bluebird');
const moment = require('moment');


threads.findOne({name: 'foo'}).then((thread) => {
  if (!thread) {
    console.log('Thread does not exist.');
  } else {
    console.log('Thread:', thread);
  }
}).catch((e) => {
  console.log('error', e);
})

/*
function createThreadForPodcastEpisode(title, content, post, successCallback) {

  // TODO: make sure it doesn't exist yet:

  threads.insert({
    title: 'Bot: Testing!',
    content: 'Some post ',
    author: monk.id('5ad6865b51d34d1c5f049bd5'),
    podcastEpisode: monk.id(post._id),
    score: 0 ,
    // __v: 0,
    deleted: false,
    commentsCount: 0,
    dateCreated: moment(Date.now()).toDate() ,
    dateLastAcitiy:   moment(Date.now()).toDate() ,
  }).then( (thread) => {
    console.log('Thread created---');
    console.log(thread);
    process.exit();
  }).catch((e) => {
    console.log('error', e);
    process.exit();
  })


}

let promises = [];
posts.find( {thread: {$exists: false}})
  .each ((post) => {

  })
  */
