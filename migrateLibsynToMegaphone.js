require('dotenv').config()

const ora = require('ora')
const cliSpinners = require('cli-spinners')
const rp = require('request-promise')
const Throttle = require('promise-parallel-throttle')
const db = require('monk')(process.env.MONGO_DB);
const posts = db.get('posts');
const records = require('./megaphone.json');

const migrateLibsynToMegaphone = async () => {
  const queue = records.map(record => {
    return async () => {
      const embed = record["Episodes Embeddable Code (dark themed)"]
      const recordTitle = record["Episodes Title"]
      const spinner = ora({
        text: `Updating: ${recordTitle}`,
        spinner: cliSpinners.bouncingBar,
      })

      spinner.start();

      // Prevents unneccessary queries to Megaphone.fm
      const post = await posts
        .findOne({
          title: { rendered: recordTitle },
          mp3: { $regex: "libsyn.com" },
        });

      let id = ""

      if (!post) {
        spinner.succeed();
        return Promise.resolve();
      }

      if (embed) {
        id = embed
          .split("https://playlist.megaphone.fm?e=")[1]
          .replace("&light=false\" width=\"100%\"></iframe>", "")
      }

      try {
        const data = await rp(`https://player.megaphone.fm/playlist/episode/${id}`)
        const dataJson = JSON.parse(data)
        const episode = Array.isArray(dataJson.episodes)
          ? dataJson.episodes[0]
          : {};

        if (episode.title && episode.episodeUrlHRef) {
          await posts.update(
            { _id: post._id },
            { $set: { mp3: episode.episodeUrlHRef } }
          );

          spinner.succeed();
        }

        return Promise.resolve();
      }
      catch (err) {
        spinner.fail(err);
        return Promise.resolve();
      }
    }
  })

  return Throttle
    .all(queue)
    .then(() => console.log('Finished'));
}

migrateLibsynToMegaphone();
