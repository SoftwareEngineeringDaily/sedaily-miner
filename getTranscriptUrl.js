require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
// const Bluebird = require('bluebird');
const rp = require('request-promise');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;


function getTranscriptUrl(post) {
  console.log(post.link)
  let options = {
    method: "GET",
    uri: post.link
  }

  return rp(options).then(response => {
    const dom = new JSDOM(response);
    let list = dom.window.document.getElementsByClassName("post__content")[0].getElementsByTagName("p")
    var info = {
      _id: post._id
    };
    
    for (var i = 0; i < list.length; i++) {
      if (list[i].innerHTML.indexOf("Transcript provided by We Edit Podcasts") > -1) {
        info.transcriptUrl = list[i].getElementsByTagName("a")[1].href;
      }
    }
    return info;
  })
}

function updateTranscriptUrl(_id, url) {
  console.log(_id, url)
  posts.update({_id: _id}, { $set: { transcript_url: url }}).then(function (result) {
    // console.log(result)
  })
}

function getAllTranscriptUrls(posts, index, callback) {
  getTranscriptUrl(posts[index]).then(result => {
    updateTranscriptUrl(result._id, result.transcriptUrl)
    if (index < posts.length - 1) {
      getAllTranscriptUrls(posts, index + 1, callback)
      return null;
    } else {
      callback(null)
    }
  }).catch(err => {
    callback(err)
  })
}

// posts.find({transcript_url: { $exists: false }}, { limit: 50 })
posts.find({})
  .then((posts) => {
    getAllTranscriptUrls(posts, 0, (err) => {
      if (err) {
        console.log(err)
        process.exit(1)  
      } else {
        process.exit()
      }
    })
  })
  .catch((error) => {
    console.log(error);
    process.exit(1)
  })







