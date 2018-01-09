require('dotenv').config()
const AWS = require('aws-sdk');
/*

AWS.config.region = 'us-west-2';
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
 */



/*
function getS3Config(S3_BUCKET, fileType, fileName) {
  // We should Make this options a helper method:
  aws.config.region = 'us-west-2';
  // const fileName = 'record-red-bg-180-2.png'; // This can be anything
  // const fileType = 'image/png'; // req.query['file-type'];
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires: 600, // in seconds
    ContentType: fileType,
    ACL: 'public-read'
  };
  return s3Params;
}

// This should be a helper library and perhaps part of user.controller isntead:
function signS3(req, res, next) {
  const S3_BUCKET = 'sd-profile-pictures';
  // Probably only need to do this once:
  const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
  const fileType = req.fileType;
  const fileName = req.user._id;
  const s3Params = getS3Config(S3_BUCKET, fileType, fileName);

  s3.getSignedUrl('putObject', s3Params, (err, data) => {
    if(err){
      console.log(err);
      return res.end();
    }
    const returnData = {
      signedRequest: data, // <-- the useful one
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };
    res.write(JSON.stringify(returnData));
    res.end();
  });
}
*/


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
