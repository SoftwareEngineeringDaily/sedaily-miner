
require('dotenv').config();
var ObjectId = require('mongodb').ObjectID;
const db = require('monk')(process.env.MONGO_DB);

console.log('Executing on db:', process.env.MONGO_DB);
const Users = db.get('users')


  //
  // Start the prompt
  //
  // prompt.start();

  //
  // Get two properties from the user: username and email
  //


const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('user id:', (id) => {
    rl.question('email:', (email) => {
        id = id.trim();
        email = email.trim();
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

        rl.close();
    });
});
