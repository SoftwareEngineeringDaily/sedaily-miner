// require('dotenv').config()
const AWS = require('aws-sdk');
const S3_BUCKET = 'sd-profile-pictures';

const fileKey = 'adfree/BadMen_adfree.mp3';
var obj = new AWS.S3({params: {Bucket: S3_BUCKET, Key: fileKey}});

obj.headObject(function(err) {
  console.log('File?' );
  if (err){
    console.log("File is present");
  }
  else { 
    console.log("File is not present");
  }
});





/*
const fileKey2 = 'adfree/Blahblah_adfree.mp3';
var obj2 = new AWS.S3({params: {Bucket: S3_BUCKET, Key: fileKey}});
obj.headObject(function(err) {
  if (err){
    console.log("File is present", fileKey2);
  }
  else { 
    console.log("File is not present", fileKey2);
  }
});
 */
