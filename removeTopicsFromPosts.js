require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const topics = db.get('topics')

// Remove topics from posts:
posts.update(
  {},
  { $unset: {topics:"", topicsGenerated:""}}, {multi: true}
)
.then(() => {
  topics.remove()
  .then(() => {
    console.log("SUCCESS");
    process.exit();
  });
})
