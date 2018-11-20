# SEDaily Miner

A script to download posts and auxilliary post details from software engineering daily via the Wordpress api: https://softwareengineeringdaily.com/wp-json/wp/v2/posts and store it into the DB, to be accessed by the sedaily API.

# Set up
 - npm install
 - cp .env.example .env

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
 - `feed-item-collector.js`

 #### - Generate a feed for anonymous users:
 - `feed-item-general-collector.js`

 #### - Add images to links that do not have one
 - `links-add-images.js`
