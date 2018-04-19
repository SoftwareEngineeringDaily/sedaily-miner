require('dotenv').config()
const monk = require('monk');
const db = require('monk')(process.env.MONGO_DB);
const rp = require('request-promise');
const threads = db.get('forumthreads')
const Bluebird = require('bluebird');
const moment = require('moment');


threads.insert({
  title: 'Bot: Testing!',
  content: 'Some post ',
  author: monk.id('5ad6865b51d34d1c5f049bd5'),
  score: 0 ,
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
