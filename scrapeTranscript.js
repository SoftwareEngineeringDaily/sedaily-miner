/*
  Script to crawl the translateURL for each post and save the transcribed transcript
  to the post in the database.
*/

require('dotenv').config()

const crawler = require('crawler-request')
const db = require('monk')(process.env.MONGO_DB)
const posts = db.get('posts')
const Bluebird = require('bluebird')
const rp = require('request-promise')
const async = require('async')

const cleanScript = (script) => {
	var cr_re = /© \d{4} Software Engineering Daily(.*?)\d{1,2}/gm //
	var page_re = /SED \d{3}/g
	var transcript_re = /Transcript/g
	var end_re = /\[END\]/g
	var nl_re = /\r?\n|\r/g
	var episode_re = /EPISODE \d{1,3}/g

	var talk_segment_re = /\[\d{1,2}\:\d{2}\:\d{2}(?:\.\d)?\](.*?)[^\[]*/g
	var intro_re = /\[INTRODUCTION\](.*?)\[\d{1,2}\:\d{2}\:\d{2}(?:\.\d)?\](.*?)[^\[]*/g
	var sponsor_re = /\[SPONSOR MESSAGE\](.*?)\[\d{1,2}\:\d{2}\:\d{2}(?:\.\d)?\](.*?)[^\[]*/g
	var time_re = /\[\d{1,2}\:\d{2}\:\d{2}(?:\.\d)?\]/g
	var talk_header_re = /\[\d{1,2}\:\d{2}\:\d{2}(?:\.\d)?\](.*?)[\:]/ig

	return script.replace(nl_re,'')
		.replace(page_re, '')
		.replace(cr_re,'')
		.replace(transcript_re,'')
		.replace(talk_segment_re,"<p>$&</p>")
		.replace(intro_re,"<span class=\"transcript-intro\">$&</span>")
		.replace(sponsor_re,"<span class=\"transcript-sponsor\">$&</span>")
		.replace(talk_header_re,"<span class=\"transcript-header\">$&</span>")
		.replace(time_re, "<span class=\"transcript-time\">$&</span>")
		.replace(episode_re,'')
		.replace(end_re,'')
		.replace(/\[INTRODUCTION\]/g,'')
		.replace(/\[INTERVIEW\]/g,'')
		.replace(/\[SPONSOR MESSAGE\]/g,'')
		.replace(/\[INTERVIEW CONTINUED\]/g,'')
		.replace(/\[END OF INTERVIEW\]/g,'')
}

var processingPosts = true
const CONCURRENCY = 5

var q = async.queue(function(post, callback) {
	let { transcriptURL } = post
	if (transcriptURL) {
		crawler(post.transcriptURL)
	    .then(async function(response) {
	    	if (response.text) {
	    		const cleaned = cleanScript(response.text)
	    		await posts.update({id: post.id}, {
					$set: {
					  "transcript": cleaned
					},
				})
				callback()
	    	} else {
	    		callback()
	    	}
		})
	} else {
		callback()
	}
}, CONCURRENCY)

q.drain = function() {
  // tasks may finish faster than added to queue, need to wait
  if (!processingPosts) {
    console.log('all items have been processed')
    db.close()
  }
}


let promises = [];
posts.find( {transcriptURL: {$exists: true}})
  .each((post) => {
    q.push(post, function (err) {
      if (err) {
        console.log(err)
      } else {
        console.log('finished processing', post.id)
      }
    });
  })
  .then(() => {
    processingPosts = false;
  })






