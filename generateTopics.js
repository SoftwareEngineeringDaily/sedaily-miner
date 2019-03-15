require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const tags = db.get('tags')
const topics = db.get('topics')
const Bluebird = require('bluebird');
const _ = require('lodash');

let newTopics = []
let promises = []

function createTopics() {
  posts.find({ filterTags: { $exists: true }}).each(async post => {
    if (post.filterTags.length != 0) {
      let k = 0;
      for (k = 0; k<post.filterTags.length; k++) {
        const tag = post.filterTags[k]
        try {
          const tagName = tag.name;

          let promise = topics.findOne({ name: tagName })
          .then((existingTopic) => {

            if (!existingTopic) {
              // create topic if is not contained in existingTopic:
              const slug = generateSlug(tagName);

              const t =_.find(newTopics, x => x.name === tagName)
              if (!t) {
                newTopics.push({
                  name: tagName,
                  slug: slug,
                  postCount: 1,
                  status: 'active'
                })
              }
            }
            })
            promises.push(promise)
          } catch(e) {
             console.log('catch', e)
          }
        }
    }
  }).then(() => {
    return Bluebird.all(promises);
  }).then(async () => {
    await addTopicsToDB()
  })
  .then(async () => {
    await addTopicsToPosts();
  });
}

async function addTopicsToDB() {
  for (let k = 0; k<newTopics.length; k++) {
    await topics.insert(newTopics[k])
  }
}

async function addTopicsToPosts() {
  let promises2 = []
  posts.find({ filterTags: { $exists: true }, topicsGenerated: { $exists: false }}).each(async function(post) {

    if (post.filterTags.length != 0) {
      let k = 0;
      for (k = 0; k<post.filterTags.length; k++) {
        // post.filterTags.map(async tag => {
          const tag = post.filterTags[k]

          const tagName = tag.name;

          let existingTopic = await topics.findOne({ name: tagName })
          //.then(async existingTopic => {

            // update topic if is contained in existingTopic:
            await posts.update({ _id: post._id },
              {
                $push: {
                  topics: existingTopic._id.toString()
                },
                $set: { topicsGenerated: true }
              }, (error) => {
                if (error) return;
              });

              await topics.update({ _id: existingTopic._id }, {
                $inc: { postCount: 1 }
              }, (err) => {
                if (err) return;
              });
          }
        }
      })
      .then(() => {
        return Bluebird.all(promises2);
      })
  }

function generateSlug(string) {
  return string
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}




createTopics()
