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
        promises.push(promise); // TODO: DRY RUN
        console.log(post._id);
      } else {
        // console.log(post._id);
        // console.log('-----error splitting document---------', splitContent);
      }
    } else {
      // console.log(post._id);
      // console.log('-----error oldContent missing ---------');
    }

    /*
    for (let url of values) {
      let extension = url.substr(url.length - 4);

      if (extension === '.mp3') {
        mp3 = url;
        break;
      }
    }*/

    /*
    if (mp3) {
      let promise = posts.update({id: post.id}, {
        $set: {
          mp3,
        },
      });
      promises.push(promise);
    }
    */
  })
  .then(() => {
    return Bluebird.all(promises);
  })
  .then(() => {
    console.log("done");
    process.exit();
  })
  .catch((error) => { console.log(error); })
