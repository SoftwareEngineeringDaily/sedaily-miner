require('dotenv').config()
const monk = require('monk');
const db = require('monk')(process.env.MONGO_DB);
const threads = db.get('forumthreads')
const posts = db.get('posts')
const users = db.get('users')
const moment = require('moment');

function createAuthorOrGetId() {
  const THREAD_AUTHOR = {
    username: 'SoftwareDaily',
    name: 'Software Daily',
    bio: 'SED',
    email: 'contact@softwaredaily.com',
    website: 'https://www.softwaredaily.com'
  };
  return new Promise (function(resolve, reject) {
    const { username } = THREAD_AUTHOR;
    users.findOne({ username }).then((user) => {
      if (user) {
        console.log(`Found user ${username}. Using id ${user._id}`);
        return resolve(user._id)
      }
      users.insert(THREAD_AUTHOR).then((newUser) => {
        console.log(`Couldn't find ${username}, created with id ${newUser._id}`);
        resolve(newUser._id)
      })
    })
  });
}

function createThreadForPodcastEpisode(post, authorId) {
  // Make sure thread doesn't exist already:
  return new Promise(function(resolve, reject) {
    threads.findOne({podcastEpisode: post._id}).then((thread) => {
      if (!thread) {
        console.log('No forum thread for this podcast exists. Good to continue.');
        const date = moment(post.date).toDate()
        threads.insert({
          title: 'Discuss: ' + post.title.rendered,
          content: ' ',
          author: authorId,
          podcastEpisode: monk.id(post._id),
          score: 0 ,
          // __v: 0,
          deleted: false,
          commentsCount: 0,
          dateCreated: date,
          dateLastAcitiy: date,
        }).then((thread) => {
          resolve(thread);
        }).catch((e) => {
          reject(e)
        })
      } else {
        console.log('!!!!!! Thread for post exists already:', thread);
        resolve();
        // TODO: associate forum thread to post:
      }
    }).catch((e) => {
      reject(e)
    })
  });
}

/*
// XXX: This removes forum thread key from episode model:
posts.find( {thread: {$exists: true}})
.each ((post) => {
  posts.update({_id: post._id}, {$unset: {
    thread: 1
  }}).then((result) => {
    console.log('removed')
  }).catch((e) => { console.log('error restting thread', e)})
});
*/

createAuthorOrGetId().then((authorId) => {
  // find all posts which do not have thread & create thread
  const promises = [];
  posts.find({thread: {$exists: false}})
    .each((post) => {
      promises.push(
        createThreadForPodcastEpisode(post, authorId).then((thread) => {
            posts.update({_id: post._id}, {
              $set: {
                thread: monk.id(thread._id),
              }
            });
          })
      )
  })
  .then(() => {
    return Promise.all(promises)
  })
  .then(() => {
    console.log('Done and closing db connection!')
    db.close();
    return process.exit()
  })
  .catch((error) => { console.log(error) })
})
