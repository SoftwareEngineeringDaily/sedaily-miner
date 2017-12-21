require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const getUrls = require('get-urls');
const Bluebird = require('bluebird');
const rp = require('request-promise');

let promises = [];
posts.find( {cleanedContent: {$exists: false}})
  .each((post) => {
    const oldContent =  post.content.rendered;

    let urls = getUrls(post.content.rendered);
    let values = urls.values();
    let mp3 = '';
    let mainImage = '';

    if (oldContent) {
      const splitContent = oldContent.split('Download</a>')
      if (splitContent.length == 2) {

        const cleanedContent = splitContent[1];
        let promise = posts.update({id: post.id}, {
          $set: {
            cleanedContent
          }
        });
        promises.push(promise); 
        console.log('success', post._id);
      } else {
         console.log(post._id);
         console.log('-----error splitting document---------', splitContent);
      }
    } else {
       console.log(post._id);
       console.log('-----error oldContent missing ---------');
    }
  })
  .then(() => {
    return Bluebird.all(promises);
  })
  .then(() => {
    console.log("done");
    process.exit();
  })
  .catch((error) => { console.log(error); })
