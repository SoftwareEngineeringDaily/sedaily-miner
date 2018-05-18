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

 #### - Fetching list of all tags:
 - `node getTags.js`

 #### - Adding Tags to all the Posts:
 - `node addTags .js`

 #### - Making Forum Threads for Post Episodes:
 - `node makeThreadForEpisodes .js`


 Also make sure to run these to populate missing fields like featuredImage, etc.





