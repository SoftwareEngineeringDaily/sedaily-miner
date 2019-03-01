require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const getUrls = require('get-urls');
const Bluebird = require('bluebird');
const rp = require('request-promise');

let promises = [];
posts.find({featuredImage: {$exists: false}})
  .each((post) => {
    let urls = getUrls(post.content.rendered);
    let values = urls.values();
    let mp3 = '';
    let mainImage = '';
    if (!post._links['wp:featuredmedia']) return;
    let medieaPromise = rp(post._links['wp:featuredmedia'][0].href)
      .then((result) => {
        let json = JSON.parse(result);
        if (!json.guid.rendered) return;

        let featuredImage = json.guid.rendered;
        console.log(featuredImage)
        return posts.update({id: post.id}, {
          $set: {
            featuredImage,
          },
        });
      })
      .catch((error) => { console.log(error); })
    promises.push(medieaPromise);
  })
  .then(() => {
    return Bluebird.all(promises);
  })
  .then(() => {
    console.log("done");
    process.exit();
  })
  .catch((error) => { console.log(error); })
