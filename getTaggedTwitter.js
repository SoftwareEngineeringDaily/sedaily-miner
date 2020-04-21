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

function handleTweet(tweet, next) {
    if (!tweet.entities.user_mentions.length) return next()

    const match = tweet.text.replace(/\n/g, ' ').match(/(.+?) @/i) // takes first part of possible tweet

    if (!match || !match.length || !match[1]) {
        return next() 
    }
    
    const searchPostStr = match[1].slice(0,match[1].length - 5) // some error margin for this post search
    
    posts.findOne({ 'title.rendered': new RegExp(searchPostStr, 'i') })
        .then((post) => {
            if (!post || post.relatedTweet) return next()

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


}

const queue = async.queue(handleTweet)
queue.drain = function() {
    console.log('End of queue')
    db.close()
}

// get last 20 tweets
twitter.get('statuses/user_timeline', {screen_name: 'software_daily'}, function(error, tweets, response) {
    if (error) { 
        db.close();
        return console.error(error)
    }

    tweets.forEach(tweet => {
        queue.push(tweet)
    });
});