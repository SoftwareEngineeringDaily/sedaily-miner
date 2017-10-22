require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const tags = db.get('tags')
const getUrls = require('get-urls');
const Bluebird = require('bluebird');

let promises = [];

posts.find({})
  .each((post) => {
    let postId = post._id;

    let promise = tags.find({id: {$in: post.tags}})
      .then((foundTags) => {
        let tagsToAdd = [];
        foundTags.forEach((foundTag) => {
          let newTagData = {
            id: foundTag.id,
            name: foundTag.name,
            slug: foundTag.slug,
          };
          tagsToAdd.push(newTagData);
        })
        console.log({id: postId})
        return posts.update({_id: postId}, {
          $set: {
            filterTags: tagsToAdd,
          },
        });
    })

    promises.push(promise)
  })
  .then(() => {
    return Bluebird.all(promises);
  })
  .then((result) => {
    console.log(result[0])
    console.log("done");
    process.exit();
  })
