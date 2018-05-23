
require('dotenv').config();
const db = require('monk')(process.env.MONGO_DB);

console.log(process.env.MONGO_DB)

db.then(() => {
  console.log('Connected correctly to server')
});

const posts = db.get('posts');
const relatedLinks = db.get('relatedlinks');
const feedItems = db.get('feeditems');

const collectLinks = function(userId, podcastId) {
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

const loopThroughEpisodes = function() {

}
const findLatestEpisodes = function(user) {
  posts.find({}, {limit: 150, sort: {date: -1}})
  .each((post) => {
      collectLinks(null, post._id);
  })
};

feedItems.remove({user: null}).then( () => {
  findLatestEpisodes();
});
