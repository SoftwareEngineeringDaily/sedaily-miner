require('dotenv').config()
const AWS = require('aws-sdk');

/*
  const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
 */

var s3 = new AWS.S3();

AWS.config.region = 'us-west-2';
const S3_BUCKET = 'sd-profile-pictures';

const fileKey = 'adfree/BadMen_adfree.mp3';
var params = {Bucket: S3_BUCKET, Key: fileKey};
s3.headObject(params).on('success', function(response) {
  console.log("Key was", response.request.params.Key);
}).on('error',function(error){
    console.log('error?', error);
     //error return a object with status code 404
}).send();


