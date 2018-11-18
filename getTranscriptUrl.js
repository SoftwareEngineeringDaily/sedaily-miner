require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
// const Bluebird = require('bluebird');
const rp = require('request-promise');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;


function getTranscriptUrl(post) {
  let options = {
    method: "GET",
    uri: post.link
  }
  var info = {
    _id: post._id
  };
  return rp(options).then(response => {
    const dom = new JSDOM(response);
    var list = dom.window.document.getElementsByClassName("post__content")[0].getElementsByTagName("p")
    
    for (var i = 0; i < list.length; i++) {
      if (list[i].innerHTML.indexOf("Transcript provided by We Edit Podcasts") > -1) {
        info.transcriptUrl = list[i].getElementsByTagName("a")[1].href;
      }
    }
    if (!info.transcriptUrl) {
    	list = dom.window.document.getElementsByClassName("post__content")[0].getElementsByTagName("div")
    	for (var i = 0; i < list.length; i++) {
	      if (list[i].innerHTML.indexOf("Transcript provided by We Edit Podcasts") > -1) {
	        info.transcriptUrl = list[i].getElementsByTagName("a")[1].href;
	      }
	    }
    }

    return info;
  })
  .catch(err => {
  	console.log(err)
  	return info;
  })
}

function updateTranscriptUrl(_id, url) {
	console.log(url)
  if (url) {
    posts.update({_id: _id}, { $set: { transcriptUrl: url }}).then(function (result) {
    })
  }
}

function getAllTranscriptUrls(posts, index, callback) {
	console.log(posts[index].link)
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

const POST_LIMIT = 0;

posts.find({transcriptUrl: { $exists: false }}, { limit: POST_LIMIT })
  .then((posts) => {
    console.log(posts.length)
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







