# SEDaily Miner

A script to download posts and auxilliary post details from software engineering daily via the Wordpress api: https://softwareengineeringdaily.com/wp-json/wp/v2/posts and store it into the DB, to be accessed by the sedaily API.

# Set up
 - `npm install`
 - `cp .env.example .env`

**Note**: Tested on Node version 7.10.1

 #### - Storing all the Posts first:
 - `node index.js`

 #### - Adding Image links for Posts:
 - `node getImg.js`

 #### - Getting Mp3 file links for Posts:
 - `node getMp3.js`

 #### - Generate clean description for Posts:
 - `node generateCleanDescription.js`

 #### - Create a discussion thread for each episode:
 - `node makeThreadForEpisodes.js`

 #### - Generate a feed for each user based on related links of listened episodes:
 - `node feed-item-collector.js`

 #### - Generate a feed for anonymous users:
 - `node feed-item-general-collector.js`

 #### - Add images to links that do not have one
 - `node links-add-images.js`

 #### - Add translate url to posts that do not have one
 - `node getTranscriptURL.js`

 #### - Add guests images to posts that do not have one
 - `node getGuestImage.js`

 #### - Generate topics

 Generates topics from Wordpress tags names. New topics adds to Topics table and increases topics counters.
 - `node getTags.js`
 - `node addTags.js`
 - `node generateTopics.js` (The process will end automatically)

 #### - Add sponsorsContent to posts that do not have one
 - `node generateSponsors.js`

# Additional scripts

 #### - Clear topics

 Removes all topics from database and the "topics" field from posts' documents (WARNING - this script removes all topics from database and all users' actions (adding and assigning) topics can be lost)

 - `node removeTopicsFromPosts.js`

 #### - Clear sponsorsContent from posts

 Removes all sponsorsContents from posts' documents (WARNING - this script removes all sponsorsContents posts!)

 - `node removeSponsorsFromPosts.js`
