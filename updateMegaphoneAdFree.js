require('dotenv').config()

const rp = require('request-promise');
const Throttle = require('promise-parallel-throttle');
const db = require('monk')(process.env.MONGO_DB);
const posts = db.get('posts');

const getAdFreeMp3 = (originalMp3) => {
  if (typeof originalMp3 !== 'string') return originalMp3;

  const privateMp3URL = 'https://s3-us-west-2.amazonaws.com/sd-profile-pictures/adfree/';
  const extractedFile = originalMp3.toString().match(/\/traffic.libsyn.co.+\/sedaily\/(.*?).mp3/);

  let privateMp3 = null;

  if (extractedFile && extractedFile.length && extractedFile[1]) {
    privateMp3 = `${privateMp3URL}${extractedFile[1]}_adfree.mp3`;
  }

  return privateMp3;
}

const per_page = 500;
const findPodcasts = async (page = 1) => {
  const path = "https://cms.megaphone.fm/api";
  const uri = `${path}/networks/${process.env.MEGAPHONE_NETWORK_ID}/podcasts/${process.env.MEGAPHONE_PODCAST_ID}/episodes`
  const options = {
    uri,
    qs: {
      per_page,
      page,
    },
    method: "GET",
    headers: {
      "Authorization": `Token token="${process.env.MEGAPHONE_API_KEY}"`,
    },
    transform: (body, response) => {
          return {
            episodes: body,
            response,
          }
      },
    json: true,
  };

  const { episodes, response } = await rp(options)
  const shouldContinue = !Boolean(episodes.length % per_page);
  const queue = episodes
    .filter(e => e.audioFile || e.originalUrl)
    .map((episode) => {
      return async () => {
        try {
          const $set = {}
          const $or = [
            { title: { rendered: episode.title } },
          ]

          if (episode.originalUrl) {
            $or.push({ mp3: episode.originalUrl });
          }

          const post = await posts.findOne({ $or });

          if (episode.originalUrl) {
            $set.mp3 = episode.originalUrl;
            $set.adFreeMp3 = getAdFreeMp3(episode.originalUrl);
          }

          if (!episode.originalUrl && episode.downloadUrl) $set.mp3 = episode.downloadUrl;
          if (episode.audioFile && !$set.adFreeMp3) $set.adFreeMp3 = episode.audioFile;
          if (episode.downloadUrl) $set.megaphoneMp3 = episode.downloadUrl;

          await posts.update(
            { title: { rendered: episode.title } },
            { $set },
          );

          return {
            title: episode.title,
            id: episode.id,
            ...$set,
          };
        }
        catch (error) {
          console.error('Error ', error);
          await Promise.resolve({
            title: episode.title,
            id: episode.id,
          });
        }
      }
    });

  await Throttle.sync(queue).then((adFreeUrls) => {
    console.log('processing podcasts: ', adFreeUrls);
    console.log('process count: ', adFreeUrls.length);
    if (shouldContinue) {
      findPodcasts(++page);
    }
    else {
      return console.log('DONE!');
    }
  })

  console.log(`Per Page: ${response.headers['x-per-page']}\nPage Number: ${response.headers['x-page']}\nTotal: ${response.headers['x-total']}\nReturn Count: ${episodes.length}`);
}

findPodcasts();
