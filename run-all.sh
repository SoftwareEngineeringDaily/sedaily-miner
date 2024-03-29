#!/bin/bash

echo 'Getting all posts'
node index.js &
echo 'Getting images'
node getImg.js
echo 'Getting mp3s'
node getMp3.js
# echo 'Generating clean description'
# node generateCleanDescription.js
node makeThreadForEpisodes.js
node feed-item-collector.js
node feed-item-general-collector.js
# node links-add-images.js # hangs up, do we even need?
echo 'Getting transcript URLs'
node getTranscriptURL.js
echo 'Getting transcript'
node getTranscript.js
echo 'Getting authors'
node getAuthor.js
echo 'Getting guest images'
node getGuestImage.js
echo 'Getting tags from Wordpress'
node getTags.js
echo 'Adding tags to DB'
node addTags.js
echo 'Generating topics'
node generateTopics.js
echo 'Generating sponsorsContent'
node generateSponsors.js
echo 'Cleaning content'
node cleanContent.js
echo 'Indexing posts for search'
node indexSearch.js
echo 'Getting related tweet for episodes'
node getTaggedTwitter.js
echo 'Getting Ad Free MP3s'
node updateMegaphoneAdFree.js
