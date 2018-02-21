
require('dotenv').config();
var ObjectId = require('mongodb').ObjectID;
const db = require('monk')(process.env.MONGO_DB);

console.log('on db:', process.env.MONGO_DB);
const Users = db.get('users')

var args = process.argv.slice(2);
  var prompt = require('prompt');

  //
  // Start the prompt
  //
  prompt.start();

  //
  // Get two properties from the user: username and email
  //
  prompt.get(['email', 'id'], function (err, result) {
    const email = result.email.trim()
    const id = result.id.trim()
    Users.find({ _id: id, email })
    .then(function(users){
      users.forEach((user) => {
        const id = user._id;
        Users.update({_id: id}, {$set: {isAdmin: true }}).catch(function(err){
          console.log("error?", err);
        }).then(function(obj){
          console.log('success turning into admin!', obj);
        });
      });
    });
});
