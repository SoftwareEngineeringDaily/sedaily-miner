require('dotenv').config()
const backup = require('mongodb-backup');

backup({
  uri: `mongodb://${process.env.MONGO_DB}`,
  root: __dirname,
  callback: function(err) {
  	if (err) {
  		console.log(err)
  	} else {
  		console.log('Finished backup')
  	}
  }
});
