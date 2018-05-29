var request = require("request");

request({
  uri: "https://softwareengineeringdaily.com/2018/05/25/autonomy-with-frank-chen/",
}, function(error, response, body) {
  console.log(body);
});
