require('dotenv').config()
const HTML = require('html-parse-stringify');
const _ =require('lodash');
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const Bluebird = require('bluebird');

let promises = [];

posts.find({guestImage: {$exists: false}})
  .each((post) => {
    if (!post["cleanedContent"]) return;

    let cleanedContent = post['cleanedContent']

    let splitedContent = splitContent(cleanedContent)

    let imageURL = getImage(splitedContent)

    return posts.update({id: post.id}, {
      $set: {
        "guestImage": imageURL
      },
    });
    promises.push(cleanedContent);
  })
  .then(() => {
    return Bluebird.all(promises);
  })
  .then(() => {
    console.log("SUCCESS");
    process.exit();
  })
  .catch((error) => { console.log(error); })

function getImage(content) {
  const parsedContent = HTML.parse(content);
  paragraph = _.find(parsedContent, function(tag) {
    return tag.name === 'p'
  })
  if (paragraph && paragraph.children) {
    const img = _.find(paragraph.children, function(tag) {
      return tag.name === 'img'
    })
    const imgURL = img.attrs.src
    return imgURL
  } else {
    return
  }
}

function splitContent(content) {
  const splitFrom = content.search("<p><img");
  const splitTo = content.search("</p>");
  var result = content.slice(splitFrom, splitTo);
  return result
}
