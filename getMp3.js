require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const getUrls = require('get-urls');
const Bluebird = require('bluebird');
const rp = require('request-promise');
const request = require("request");

let promises = [];

let fakePlayer = `<!--powerpress_player--><div class="powerpress_player" id="powerpress_player_9728"><!--[if lt IE 9]><script>document.createElement('audio');</script><![endif]-->↵<audio class="wp-audio-shortcode" id="audio-4917-1" preload="none" style="width: 100%;" controls="controls"><source type="audio/mpeg" src="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3?_=1" /><a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3">http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3</a></audio></div><p class="powerpress_links powerpress_links_mp3">Podcast: <a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3" class="powerpress_link_pinw" target="_blank" title="Play in new window" onclick="return powerpress_pinw('https://softwareengineeringdaily.com/?powerpress_pinw=4917-podcast');" rel="nofollow">Play in new window</a> | <a href="http://traffic.libsyn.com/sedaily/2018_05_21_VoiceRecognitionAnalysis.mp3" class="powerpress_link_d" title="Download" rel="nofollow" download="2018_05_21_VoiceRecognitionAnalysis.mp3">Download</a></p><p><img data-attachment-id="2475" data-permalink="https://softwareengineeringdaily.com/2016/04/19/googles-container-management-brendan-burns/brendan-burns/" data-orig-file="https://i0.wp.com/softwareengineeringdaily.com/wp-content/uploads/2016/04/brendan-burns.jpg?fit=175%2C175&amp;ssl=1" data-orig-size="175,175" data-comments-opened="0" data-image-meta="{&quot;aperture&quot;:&quot;0&quot;,&quot;credit&quot;:&quot;&quot;,&quot;camera&quot;:&quot;&quot;,&quot;caption&quot;:&quot;&quot;,&quot;created_timestamp&quot;:&quot;0&quot;,&quot;copyright&quot;:&quot;&quot;,&quot;focal_length&quot;:&quot;0&quot;,&quot;iso&quot;:&quot;0&quot;,&quot;shutter_speed&quot;:&quot;0&quot;,&quot;title&quot;:&quot;&quot;,&quot;orientation&quot;:&quot;0&quot;}" data-image-title="brendan-burns" data-image-description="" data-medium-file="https://i0.wp.com/softwareengineeringdaily.com/wp-content/uploads/2016/04/brendan-burns.jpg?fit=175%2C175&amp;ssl=1" data-large-file="https://i0.wp.com/softwareengineeringdaily.com/wp-content/uploads/2016/04/brendan-burns.jpg?fit=175%2C175&amp;ssl=1" class="alignright size-full wp-image-2475" style="border-radius: 50%; border: 1px solid #000000; max-width: 175px; max-height: 175px;" src="https://i2.wp.com/softwareengineeringdaily.com/wp-content/uploads/2018/05/RitaSingh.jpeg?resize=175%2C175&#038;ssl=1" width="175" height="175" data-recalc-dims="1" /><span style="font-weight: 400;">A sample of the human voice is a rich piece of unstructured data. Voice recordings can be turned into visualizations called spectrograms. Machine learning models can be trained to identify features of these spectrograms. Using this kind of analytic strategy, breakthroughs in voice analysis are happening at an amazing pace.</span></p>`
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
