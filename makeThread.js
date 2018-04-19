require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const rp = require('request-promise');
const threads = db.get('forumthreads')
const Bluebird = require('bluebird');
const moment = require('moment');

threads.insert({
  title: 'Bot: Testing',
  content: 'Some post ',
  author: '5ad6865b51d34d1c5f049bd5',
  score: 0 ,
  commentsCount: 0,
  dateCreated: Date.now(),
  dateLastAcitiy:  Date.now()
}).then( (thread) => {
  console.log('Thread created---');
  console.log(thread);
  process.exit();
}).catch((e) => {
  console.log('error', e);
  process.exit();
})
