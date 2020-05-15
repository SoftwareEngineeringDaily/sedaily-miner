require('dotenv').config()

const db = require('monk')(process.env.MONGO_DB)
const http = require('http')
const https = require('https')
const posts = db.get('posts')
const getMP3Duration = require('get-mp3-duration')
const getUrls = require('get-urls')
const Bluebird = require('bluebird')
const rp = require('request-promise')
const request = require("request")
const async = require('async')

let promises = [];

let fakePlayer = `<!--powerpress_player--><div class="powerpress_player" id="powerpress_player_9728"><!--[if lt IE 9]><script>document.createElement('audio');</script><![endif]-->↵<audio class="wp-audio-shortcode" id="audio-4917-1" preload="none" style="width: 100%;" controls="controls"><source type="audio/mpeg" src="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3?_=1" /><a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3">http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3</a></audio></div><p class="powerpress_links powerpress_links_mp3">Podcast: <a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3" class="powerpress_link_pinw" target="_blank" title="Play in new window" onclick="return powerpress_pinw('https://softwareengineeringdaily.com/?powerpress_pinw=4917-podcast');" rel="nofollow">Play in new window</a> | <a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3" class="powerpress_link_d" title="Download" rel="nofollow" download="2018_05_21_VoiceRecognitionAnalysis.mp3">Download</a></p>`
let placeHolder = `http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3`;
let placeHolder2 = `2018_05_21_VoiceRecognitionAnalysis.mp3`;
let placeHolder3 = `4917`;

const getMp3Buffer = (mp3) => {
  return new Promise((resolve, reject) => {
    // http.get(mp3, (res) => {
    //   let data = []

    //   res.setEncoding('binary')
    //   res.on('data', (chunk) => {
    //       data.push(chunk)
    //   })

    //   res.on('error', () => {
    //     return reject()
    //   })

    //   res.on('end', () => {
    //     let buffer = Buffer.concat(data)
    //     console.log('buffer ', buffer.toString('base64'))
    //     return resolve(buffer)
    //   })
    // })

    const Module = /https\:\/\//.test(mp3) ? https : http

    Module.get(mp3, (res) => {
      const chunks = []

      res.on('data', chunk => {
        console.log('chunk? ', chunk)
        chunks.push(Buffer.from(chunk))
      }).on('end', () => {
        const buffer = Buffer.concat(chunks)
        console.log('chunks ', chunks)
        console.log(buffer.toString('base64'))
        return resolve(buffer)
      })
    })
  })
}

const CONCURRENCY = 5
var q = async.queue(function(post, callback) {
  request({
    uri: post.link,
  }, async (error, response, body) => {
    const urls = getUrls(body);
    const values = urls.values();
    var mp3 = null;
    for (let url of values) {
      let extension = url.substr(url.length - 4);

      if (
        extension === '.mp3' && 
        (url.indexOf('libsyn.com/sedaily') >= 0 || url.indexOf('libsyn.com/secure/sedaily') >= 0)
        ) {
        mp3 = url;
        break;
      }
    }

    if (mp3) {
      // HACK so current build of iOS doesn't break:
      let mp3Buffer = await getMp3Buffer(mp3)
      console.log(mp3Buffer.toString('base64'))
      let mp3Duration = getMP3Duration(mp3Buffer)
      let newPreContent = fakePlayer.split(placeHolder).join(mp3).split(placeHolder2).join('').split(placeHolder3).join(post.id)
      let content = {
        protected: false,
        rendered: newPreContent + post.content.rendered
      }

      console.log('mp3 ', mp3)
      console.log('mp3Duration ', mp3Duration)
      posts.update({id: post.id}, {
        $set: {
          mp3,
          content
        },
      })
      .then((result) => {
        console.log('sucess updating', mp3);
        callback();
      })
      .catch((error) => {
        callback(error);
      })
    } else {
      console.log('No mp3 for', post.id)
      callback();
    }
  });
}, CONCURRENCY);

q.drain = function() {
  console.log('all items have been processed');
  db.close();
};

posts.find( {mp3: {$exists: false}})
  .each((post) => {
    q.push(post, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log('finished processing', post.id);
      }
    });
  })
