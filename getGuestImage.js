/*
  Script to find guest's image URL from cleanedContent for each post and
  add this to the post in the database.
*/

require('dotenv').config()
const HTML = require('html-parse-stringify');
const _ = require('lodash');
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

    console.log("To id: " + post.id + "\nAdd: " + imageURL + "\n");
    let promise = posts.update({id: post.id}, {
      $set: {
        "guestImage": imageURL
      },
    });
    promises.push(promise);
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
  try {
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
  } catch (e) {
    console.log(e);
  }
}

function splitContent(content) {
  const splitFrom = content.search("<p><img");
  const splitTo = content.search("</p>");
  var result = content.slice(splitFrom, splitTo);
  return result
}
