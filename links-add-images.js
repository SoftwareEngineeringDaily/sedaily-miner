// Script to add images to links that do not have one

const htmlToJson  = require('html-to-json');
const _ = require('lodash');
const validUrl = require('valid-url');

const axios = require('axios');
require('dotenv').config();
var diffbotToken =   process.env.DIFFBOT_TOKEN;


let Bluebird = require('bluebird');
const  MetaInspector  = require('meta-scrape');
const db = require('monk')(process.env.MONGO_DB);
db.then(() => {
  console.log('Connected correctly to server')
})







const getImageAsUrl = function(imageUrl, url) {
  if(url[url.length -1 ] === '/') {
    return url.substr(0, url.length-1) + imageUrl;
  } else {
    return url + imageUrl;
  }
}

const getBestImage = function(images, url) {
  if(images == null || images.legnth == 0 ) return null;
  let  bestImage = images[0];
  console.log('best image', bestImage);
  if (bestImage == null) return null;
  _.each(images, function(image) {
    if(image.indexOf('.png') > 0 || 
       image.indexOf('.jpeg') > 0 || 
       image.indexOf('.jpg') > 0
      ) { 
        if(image.indexOf('http') === 0 || image.indexOf('www') === 0) {
          bestImage = image;
        }
      }
  });

  // If not a URI:
  if(bestImage.indexOf('/') === 0 ) {
    bestImage = getImageAsUrl(bestImage, url);
  }
  
  if( !validUrl.isUri(bestImage) ) {
    cosole.log('Invalid image url---------------------', bestImage, ' --url: ', url);
    return null;
  }
  
  return bestImage;
}


// const url ='https://techcrunch.com/2018/01/09/the-ever-ending-story/';



const getImage = function(link) {


  let url = link.url;

  if (url && url.indexOf('http') == 0 ) {
  } else {
    url  =  'http://' + url;
    console.log('modified url', url);
  }


  var p = new Promise(function( resolve, reject)  { 
    htmlToJson.request(url, {
      'images': ['img', function ($img) {
        return $img.attr('src');
      }]
    }, function (err, result) {
      if(err) {
        return reject({error: err, link});
      } else {
        const images = result.images;
        try { 
          const bestImage = getBestImage(images, url);
          if (bestImage == null ) {
            return reject({error: 'No image found', link});
          } else {
            return resolve({image: bestImage, link});
          }
        } catch(e)  {
          return reject({error: e, link});
        }
      }
    });
  });
  return p;
}




const relatedLinks = db.get('relatedlinks');
const unrelatedLinks = db.get('unrelatedlinks');


// This will get us a link array for each:

const getRelatedLinkPromise = relatedLinks.find({image: null});
const getUnrelatedLinksPromise = unrelatedLinks.find({image: null});
const dbTables = [relatedLinks, unrelatedLinks];

// TODO: refactor this:


let relatedLinkPromises = [];
getRelatedLinkPromise.each((link) => {
    const p = getImage(link)
    .then(function({image, link})  {
      console.log('Found an image:**********', image, 'link: ', link.url, link._id);

      return relatedLinks.update({_id: link._id}, {$set: {image}})
      .then((result) => {
        console.log('success inserting into db')
      })
      .catch((error) => {
        console.log('error updating link', error)
      })
    })
    .catch(function(error){
      console.log('::::::::::::err', error);
      // getImage2(link);
    });
    relatedLinkPromises.push(p);
})
.then(() => {
  return Bluebird.all(relatedLinkPromises);
})
.then(() => {
  console.log("done with related links");
})
.catch((error) => { console.log(error); })
              


let unrealtedLinkPromises  = [];
getUnrelatedLinksPromise.each((link) => {
    const p = getImage(link)
    .then(function({image, link})  {
      console.log('Found an image:**********', image, 'link: ', link.url, link._id);

      return unrelatedLinks.update({_id: link._id}, {$set: {image}})
      .then((result) => {
        console.log('success inserting into db')
      })
      .catch((error) => {
        console.log('error updating link', error)
      })
    })
    .catch(function(error){
      console.log('::::::::::::err', error);
      // getImage2(link);
    });
    unrealtedLinkPromises.push(p);
})
.then(() => {
  return Bluebird.all(unrealtedLinkPromises);
})
.then(() => {
  console.log("done with UNrelated links");
})
.catch((error) => { console.log(error); })










// Refactor this code
// Ideas --> get another image scraping library
// Get a library to grab all img tags and just pull the firs tone
