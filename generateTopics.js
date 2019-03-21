require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const tags = db.get('tags')
const topics = db.get('topics')
const Bluebird = require('bluebird');
const _ = require('lodash');

let newTopics = []
let promises = []
let i = 0
function createTopics() {
  posts.find({ filterTags: { $exists: true }}).each(async post => {
    try {
      i++
      console.log(i);
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
                // const slug = generateSlug(tagName);

                const t =_.find(newTopics, x => x.name === tagName)
                if (!t) {
                  newTopics.push({
                    name: tagName,
                    slug: tag.slug,
                    postCount: 1,
                    status: 'active'
                  })
                }
              }
            });
              promises.push(promise)
            } catch(e) {
               console.log('catch', e)
            }
          }
      }
    } catch(e) {
      console.log('ERROR', e)
    }
  }).then(() => {
    try {
      return Bluebird.all(promises);
    } catch(e) { console.log(e)}
  }).then(async () => {
    await addTopicsToDB()
  })
  .then(async () => {
    await addTopicsToPosts()
    .then(() => {
      console.log("SUCCESS");
      process.exit();
    })
  });
}


async function addTopicsToPosts() {
  let promises2 = []
  async function asyncTopicToPosts(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

  const postsWithTags = await posts.find({ filterTags: { $exists: true }, topicsGenerated: { $exists: false }})

  await asyncTopicToPosts(postsWithTags, async (post) => {

    if (post.filterTags.length != 0) {
      for (k = 0; k<post.filterTags.length; k++) {
        const tag = post.filterTags[k]

        const tagName = tag.name;

        let existingTopic = await topics.findOne({ name: tagName })
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

async function addTopicsToDB() {
  for (let k = 0; k<newTopics.length; k++) {
    await topics.insert(newTopics[k])
  }
}
