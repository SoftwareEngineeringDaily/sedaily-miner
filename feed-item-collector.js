require('dotenv').config();
const db = require('monk')(process.env.MONGO_DB);

console.log(process.env.MONGO_DB)

db.then(() => {
  console.log('Connected correctly to server')
});

const users = db.get('users')
const listeneds = db.get('listeneds');
const relatedLinks = db.get('relatedlinks');
const feedItems = db.get('feeditems');

const collectLinks = function(userId, podcastId) {
  console.log(userId, podcastId)
  relatedLinks.find({post: podcastId})
  .each((link) => {
    const feedItem = {
      relatedLink: link._id,
      user: userId,
      // We use a random order, might collide but unlikely:
      randomOrder: Math.floor((Number.MAX_SAFE_INTEGER-10) * Math.random())
    }
    feedItems.insert(feedItem).then((insertedItem) => {
      console.log('feeditem', insertedItem);
    })
    .catch((error) => {
      console.log('error', error);
    })
  });
}

const loopThroughListens = function(user) {
  const userId = user._id;
  listeneds.find({userId})
    .each((listened) => {
      collectLinks(userId, listened.postId)
    })
};

users.find({})
  .each((user) => {
    feedItems.remove({user: user._id}).then( () => {
      loopThroughListens(user);
    })
  });
