require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const getUrls = require('get-urls');
const Bluebird = require('bluebird');
const rp = require('request-promise');
const request = require("request");

let promises = [];

let fakePlayer = `<!--powerpress_player--><div class="powerpress_player" id="powerpress_player_9728"><!--[if lt IE 9]><script>document.createElement('audio');</script><![endif]-->↵<audio class="wp-audio-shortcode" id="audio-4917-1" preload="none" style="width: 100%;" controls="controls"><source type="audio/mpeg" src="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3?_=1" /><a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3">http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3</a></audio></div><p class="powerpress_links powerpress_links_mp3">Podcast: <a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3" class="powerpress_link_pinw" target="_blank" title="Play in new window" onclick="return powerpress_pinw('https://softwareengineeringdaily.com/?powerpress_pinw=4917-podcast');" rel="nofollow">Play in new window</a> | <a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3" class="powerpress_link_d" title="Download" rel="nofollow" download="2018_05_21_VoiceRecognitionAnalysis.mp3">Download</a></p>`
let placeHolder = `http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3`;
let placeHolder2 = `2018_05_21_VoiceRecognitionAnalysis.mp3`;


posts.find( {mp3: {$exists: false}})
  .each((post) => {

    request({
      uri: post.link,
    }, function(error, response, body) {
      const urls = getUrls(body);

      let values = urls.values();
      var mp3 = null;
      for (let url of values) {
        let extension = url.substr(url.length - 4);

        if (extension === '.mp3' && url.indexOf('libsyn.com/sedaily') >= 0) {
          mp3 = url;
          break;
        }
      }

      if (mp3) {
        // HACK so current build of iOS doesn't break:
        let newPreContent = fakePlayer.split(placeHolder).join(mp3).split(placeHolder2).join('');

        let content = { protected: false, rendered: newPreContent + post.content.rendered};


        console.log('mp3', mp3);
         posts.update({id: post.id}, {
          $set: {
            mp3,
            content
          },
        })
        .then((result) => { console.log('sucess updating', mp3); })
        .catch((error) => { console.log(error); })
      }
    });
  })
  .catch((error) => { console.log(error); })
