# About

A simple script to download posts from software engineering daily via the Wordpres api: https://softwareengineeringdaily.com/wp-json/wp/v2/posts

# Set up
 - npm install
 - cp .env.example .env

 ## Fetching all the posts first:
 - node index.js

 Also make sure to run these to populate missing fields like featuredImage, etc:

node getimg.js
node getmp3.js


Not sure if this is working: will need to investigate:
node getTags.js

node addTags .js
