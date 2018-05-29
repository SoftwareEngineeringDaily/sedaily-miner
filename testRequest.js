const request = require("request");
const getUrls = require('get-urls');

request({
  uri: "https://softwareengineeringdaily.com/2018/05/25/autonomy-with-frank-chen/",
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
  console.log(mp3);
});
