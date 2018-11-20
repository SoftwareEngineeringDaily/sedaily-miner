require('dotenv').config()
const monk = require('monk');
const db = require('monk')(process.env.MONGO_DB);
const rp = require('request-promise');
const threads = db.get('forumthreads')
const users = db.get('users')
const Bluebird = require('bluebird');
const moment = require('moment');

var colors = require('colors/safe');
var passwordGenerator = require('generate-password');


// THIS IS what we go by when finding a user:
const forumAdminEmail  = process.env.FORUM_ADMIN_EMAIL ? process.env.FORUM_ADMIN_EMAIL : 'contact@softwaredaily.com';


const name  = process.env.FORUM_ADMIN_NAME ? process.env.FORUM_ADMIN_NAME : 'Forum';


const username  = process.env.FORUM_ADMIN_USERNAME ? process.env.FORUM_ADMIN_USERNAME : 'forumAdmin';

const password  = passwordGenerator.generate({
	length: 20,
	numbers: true
});

const userObject = {
  // avatarUrl: 
  // bio: '',
  // isAdmin: true,
  name, // TODO: pull from .env
  password,
  username,
  email: forumAdminEmail
};

// First try to find the user, if it doesn't exist, then create it:

users.findOne({email: forumAdminEmail}).then((user) => {
  if(!user) {
    // Create user
    console.log("Creating a new user since one doesn't exist");
    users.insert(userObject).then((newUser)  => {
      console.log(colors.green('newUser'), newUser)
      process.exit();
    }).catch((error) => {
      console.log(colors.red('Error:'), error);
      process.exit();
    });
  } else {
    console.log(colors.yellow('Forum User Already Exists:'), user);
    process.exit();
  }
});

