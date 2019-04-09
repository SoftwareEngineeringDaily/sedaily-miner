require('dotenv').config();
const db = require('monk')(process.env.MONGO_DB);
const posts = db.get('posts');
const request = require("request");
const getUrls = require('get-urls');
const Bluebird = require('bluebird');

let postCount = 0

// function generateSponsors() {
//   posts.find({ sponsorsContent: { $exists: false }}).each( async post => {
//
//     let req = await request({
//       uri: post.link,
//     }, async function(error, response, body) {
//       console.log('2');
//       console.log(postCount);
//       postCount ++
//       let sponsorsContent = body.split('<h3>Sponsors</h3>')
//
//       if (sponsorsContent.length == 2) {
//         sponsors = sponsorsContent[1].trim();
//
//         sponsorsNoWhiteSpaces = sponsors.replace(/\>\s+\</g,'><')
//         let sponsorsCut = sponsorsNoWhiteSpaces.split('</div></div><div class="col-xs-12 col-md-6 col-lg-3">')
//         sponsorsContent = sponsorsCut[0];
//         console.log('3');
//         await posts.update({id: post.id}, {
//           $set: {
//             "sponsorsContent": sponsorsContent
//           },
//         })
//         console.log('4');
//         console.log("Add sponsors to: ", postCount);
//       }
//     })
//   })
// }
let promises = []
let postsArray = []
function generateSponsors() {
  posts.find({ sponsorsContent: { $exists: false }}).each( post => {
    console.log("Add: ", post.id);
    postsArray.push(post)
  })
  .then(async() => {
    let post
    for (let i = 0; i <postsArray.length; i++) {
      post = postsArray[i]
      console.log("I1: ",i);
      let promise = await request({
        uri: post.link,
      }, function(error, response, body) {
        post = postsArray[i]
        postCount ++
        console.log("I2: ",i);
        console.log('2');
        console.log(postCount);
        let sponsorsContent = body.split('<h3>Sponsors</h3>')

        if (sponsorsContent.length == 2) {
          sponsors = sponsorsContent[1].trim();

          sponsorsNoWhiteSpaces = sponsors.replace(/\>\s+\</g,'><')
          let sponsorsCut = sponsorsNoWhiteSpaces.split('</div></div><div class="col-xs-12 col-md-6 col-lg-3">')
          sponsorsContent = sponsorsCut[0];
          console.log('3');
          let promise2 = posts.update({id: post.id}, {
            $set: {
              "sponsorsContent": sponsorsContent
            },
          })
          promises.push(promise2)
          console.log('4');
          console.log("Add sponsors to: ", postCount);
        }
      })
      promises.push(promise)
    }

  })
  .then(() => {
    return Bluebird.all(promises);
  })
}

generateSponsors();
