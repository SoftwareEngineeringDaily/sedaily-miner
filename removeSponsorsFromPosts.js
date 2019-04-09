require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')

// Remove sponsors from posts:
posts.update(
  {},
  { $unset: {sponsorsContent: ""}}, {multi: true}
)
.then(() => {
  console.log("SUCCESS");
  process.exit();
});
