require('dotenv').config();
const db = require('monk')(process.env.MONGO_DB);
const posts = db.get('posts');
const request = require("request");
const getUrls = require('get-urls');

let postCount = 0

function generateSponsors() {
  posts.find({ sponsorsContent: { $exists: false }}).each(async post => {
    postCount++
    console.log(postCount);
    const uri = post.link

    await request({
      uri: uri,
    }, async function(error, response, body) {
      postCount ++
      let sponsorsContent = body.split('<h3>Sponsors</h3>')

      if (sponsorsContent.length == 2) {
        sponsors = sponsorsContent[1].trim();

        sponsorsNoWhiteSpaces = sponsors.replace(/\>\s+\</g,'><')
        let sponsorsCut = sponsorsNoWhiteSpaces.split('</div></div><div class="col-xs-12 col-md-6 col-lg-3">')
        sponsorsContent = sponsorsCut[0];

        await posts.update({id: post.id}, {
          $set: {
            "sponsorsContent": sponsorsContent
          },
        });
      }
    })
  })
}

generateSponsors();
