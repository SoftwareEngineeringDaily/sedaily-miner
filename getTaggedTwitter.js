require('dotenv').config()
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const Twitter = require('twitter')
const async = require('async')

const twitter = new Twitter({
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
});

const query = {
  screen_name: 'software_daily',
  count: 200,
  include_rts: false,
  exclude_replies: true
}

function handleTweet(tweet, next) {
  if (!tweet.entities.user_mentions.length) return next()

  const match = tweet.text.replace(/\n/g, ' ').match(/(.+?) @/i) // takes first part of possible tweet

  if (!match || !match.length || !match[1]) {
    return next()
  }
    
  try {

    // We've had a few different tweets during this time
    // Here there are approaches to filter as much as possible and exclude some options
    let searchPostStr = match[1].replace('[podcast] ', '')
      .slice(0, 30) // some error margin for this post search
      .replace(/[\(\)\*\\\/\^\~\[\]\{\}]/g, '.')
    
    posts.findOne({ 'title.rendered': new RegExp(searchPostStr, 'i') })
      .then((post) => {
        if (!post) {
          return next()
        }
        if (post.relatedTweet) return next()

        const update = {
          relatedTweet: tweet.id_str,
          relatedTweetUsers: tweet.entities.user_mentions.map((user) => {
            const { screen_name, name, id_str } = user
            return { screen_name, name, id_str }
          })
        }
        
        posts.update({id: post.id}, {
          $set: update,
        })
        .then(() => {
          console.log(`Updated: [${post.id}] ${post.title.rendered}`)
          next()
        })
        .catch((error) => {
          console.error(`${post.title.rendered}: ${error.toString()}`)
          next()
        })
      })

  } catch(e) {
    console.error(e)
    next()
  }
}

const queue = async.queue(handleTweet)
queue.drain = function() {
  console.log('End of queue')
  db.close()
}

queue.pause();

let waveNumber = 1
let totalTweets = 0

// this gets tweets in "waves". The last tweet id is used for the next search wave
// https://developer.twitter.com/en/docs/tweets/timelines/guides/working-with-timelines
// https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline
function getTweetsWave(maxId = undefined) {
  twitter.get('statuses/user_timeline', { ...query, max_id: maxId }, function(error, tweets) {
    if (error) { 
      db.close();
      return console.error(error)
    }
    
    if (!tweets.length) { queue.resume(); return console.log('End of Twitter search queue') }

    totalTweets += tweets.length
    console.log(`[${waveNumber++}] Got more ${tweets.length} tweets, total ${totalTweets}`)

    tweets.forEach(tweet => {
      queue.push(tweet)
    });

    const latTweetId = tweets[tweets.length -1].id

    if (latTweetId !== maxId) getTweetsWave(latTweetId)
    else {
      queue.resume();
      return console.log('End of Twitter search queue')
    }
  });
}

getTweetsWave()