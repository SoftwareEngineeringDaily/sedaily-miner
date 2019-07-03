require('dotenv').config()
const monk = require('monk');
const db = require('monk')(process.env.MONGO_DB);
const rp = require('request-promise');
const listeneds = db.get('listeneds')
const users = db.get('users')
const posts = db.get('posts')
const Bluebird = require('bluebird');
const moment = require('moment');

var colors = require('colors/safe');
var passwordGenerator = require('generate-password');
const passwordParams = {
  length: 20,
	numbers: true
}


const testUsers = [
  {
    favoriteTopic: 'Bitcoin',
    name: 'Bobby',
    username: 'bitcoin_bobby'
  },
  {
    favoriteTopic: 'Javascript',
    name: 'Jenny',
    username: 'javascript_jenny'
  },
  {
    favoriteTopic: 'Security',
    name: 'Sarah',
    username: 'security_sarah'
  },
  {
    favoriteTopic: 'Kafka',
    name: 'Kevin',
    username: 'kafka_kevin'
  },
  {
    favoriteTopic: 'Cloud',
    name: 'Charlie',
    username: 'cloud_charlie'
  }
]

function addUsers(userObjects) {
  var index = 0;
  return new Promise((resolve, reject) => {
    userObjects.forEach(user => {
      var userObject = {
        name: `${user.favoriteTopic} ${user.name}`,
        username: user.username,
        password: passwordGenerator.generate(passwordParams),
        email: `${user.username}@testuser.com`
      }
      users.findOne({email: userObject.email}).then((user) => {
        if (!user) {
          users.insert(userObject).then((newUser)  => {
            console.log(colors.green('newUser'), newUser)
            if (index == userObjects.length - 1) {
              resolve();
            }
            index++
          }).catch((error) => {
            console.log(colors.red('Error:'), error);
            reject(error);
          });
        } else {
          console.log(colors.yellow('User Already Exists:'), user.name);
          if (index == userObjects.length - 1) {
            resolve()
          } else {
            index++;
          }
        }
      })
    })
  })
}

function addUserListens(user) {
  var totalEps = 0;
  const titleSearch = {};
  const query = {};
  const searchWords = user.favoriteTopic.split(' ').join('|');
  titleSearch['title.rendered'] = {
    $regex: new RegExp(`${searchWords}`, 'i')
  };
  query.$or = [titleSearch];
  // return new Promise((resolve, reject) => {
    posts.find(query).then((posts) => {
      totalEps += posts.length
      console.log(user.favoriteTopic, posts.length)
      posts.forEach(post => {
        listeneds.findOne({
          postId: post._id,
          userId: user._id
        }).then(listenedPost => {
          if (!listenedPost) {
            listeneds.insert({
              postId: post._id,
              userId: user._id
            })
          } else {
            // console.log(listenedPost)
          }
        })
      })
      // resolve();
    })
  // })
}

function addAndListens() {
  addUsers(testUsers).then(() => {
    testUsers.forEach(testUser => {
      users.findOne({email: `${testUser.username}@testuser.com`})
      .then(user => {
        testUser._id = user._id;
        addUserListens(testUser);
      })
    })
  })
}

addAndListens()
