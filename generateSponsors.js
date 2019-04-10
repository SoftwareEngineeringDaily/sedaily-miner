require('dotenv').config();
const db = require('monk')(process.env.MONGO_DB);
const posts = db.get('posts');
const request = require("request");
const getUrls = require('get-urls');

let postCount = 0
let postsArray = []

function generateSponsors() {
  console.log("Wait for start script...");
  posts.find({ sponsorsContent: { $exists: false }}).each( post => {
    postsArray.push(post)
  })
  .then(() => {
    let post
    for (let i = 0; i <postsArray.length; i++) {
      post = postsArray[i]
      request({
        uri: post.link,
      }, function(error, response, body) {
        post = postsArray[i]
        postCount ++
        console.log(postCount + "/" + postsArray.length);
        let sponsorsContent = body.split('<h3>Sponsors</h3>')

        if (sponsorsContent.length == 2) {
          sponsors = sponsorsContent[1].trim();
          sponsorsNoWhiteSpaces = sponsors.replace(/\>\s+\</g,'><')
          let sponsorsCut = sponsorsNoWhiteSpaces.split('</div></div><div class="col-xs-12 col-md-6 col-lg-3">')
          sponsorsContent = sponsorsCut[0];

          posts.update({id: post.id}, {
            $set: {
              "sponsorsContent": sponsorsContent
            },
          })
          console.log("Add sponsors to: ", post.title["rendered"]);
        }
      })
    }
  })
}

generateSponsors();
