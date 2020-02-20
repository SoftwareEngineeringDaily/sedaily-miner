/*
  Script to find translateURL from cleanedContent for each post and
  add this to the post in the database.
*/

require('dotenv').config()

const HTML = require('html-parse-stringify')
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const Bluebird = require('bluebird')
const getUrls = require('get-urls')
const rp = require('request-promise')
const moment = require('moment')
const parsePdf = require('./parsePdf')
const DomParser = require('dom-parser')

const parser = new DomParser()
const SET_NULL_AFTER_DAYS = 30 // The number of days after script sets transcript URL to null if not set yet

let promises = []
let postsCount = 0

posts
  .find({ author: { $type: 16 } })
  .each((post) => {
    postsCount++

    let requestPromise = rp(post.link)
    .then(async (body) => {
      let dom = parser.parseFromString(body)
      let links = dom.getElementsByTagName('a')
      let images = dom.getElementsByTagName('img')
      let name = ''
      let url = ''
      let image = ''

      for (let i = 0; i < links.length; i++) {
        if (links[i].getAttribute('rel') === 'author') {
          name = (links[i].textContent || '').trim()
          url = (links[i].getAttribute('href') || '').trim()
          break
        }
      }

      for (let i = 0; i < images.length; i++) {
        if ((images[i].getAttribute('src') || '').search('https://secure.gravatar.com/avatar/') >= 0) {
          image = (images[i].getAttribute('src') || '').trim()
        }
      }

      await posts.update({ id: post.id }, {
        $set: {
          "author": { name, url, image },
        },
      })
    })
    .catch((error) => {
      if (error.statusCode !== 429 && error.statusCode !== 504) {
        console.log('Error', error)
      }
    })

    promises.push(requestPromise)
    console.log('posts count: ', postsCount)
  })
  .then(() => {
    console.log('BLUEBIRD')
    return Bluebird.all(promises)
  })
  .then(() => {
    console.log("done")
    process.exit()
  })
  .catch((error) => {
    console.log(error)
  })
