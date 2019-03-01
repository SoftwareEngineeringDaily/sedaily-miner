require('dotenv').config()
const HTML = require('html-parse-stringify');
const _ =require('lodash');
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const Bluebird = require('bluebird');

let promises = [];

posts.find({transcriptURL: {$exists: false}})
  .each((post) => {
    if (!post["cleanedContent"]) return;

    let cleanedContent = post['cleanedContent']

    let splitedContent = splitContent(cleanedContent)

    let transcriptURL = getTranscript(splitedContent)
    console.log("To id: " + post.id + "\nAdd: " + transcriptURL + "\n");
    return posts.update({id: post.id}, {
      $set: {
        "transcriptURL": transcriptURL
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

function getTranscript(content) {
  try {
    const parsedContent = HTML.parse(content);
    paragraph = _.find(parsedContent, function(tag) {
      return tag.name === 'p'
    })
    if (paragraph && paragraph.children) {
      const transcript = _.findLast(paragraph.children, function(tag) {
        return tag.name === 'a'
      })
      const transcriptURL = transcript.attrs.href
      return transcriptURL
    } else {
      return
    }
  } catch (e) {
    console.log(e);
  }
}

function splitContent(content) {
  const splitFrom = content.search("<h2>Transcript</h2>");
  const splitTo = content.search("</a></p>");
  var result = content.slice(splitFrom, splitTo);
  return result
}
