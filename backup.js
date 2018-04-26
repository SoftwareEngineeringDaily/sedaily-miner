require('dotenv').config()
const backup = require('mongodb-backup');
const AWS = require('aws-sdk'); 
const fs =  require('fs');
const archiver = require('archiver');
const rimraf = require('rimraf');
const AWS_BUCKET = process.env.AWS_BUCKET;

AWS.config = new AWS.Config();
AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
const s3 = new AWS.S3();

function backupMongo() {
	return new Promise((resolve, reject) => {
		backup({
		  uri: `mongodb://${process.env.MONGO_DB}`,
		  root: __dirname,
		  callback: function(err) {
		  	if (err) {
		  		reject(err)
		  	} else {
		  		resolve({directoryPath: process.env.MONGO_DB.split('/')[1]})
		  	}
		  }
		});
	})
}

function removeDirectory(directory) {
	return new Promise((resolve, reject) => {
		if (directory[0] == '/') {
			reject('No top level directories can be removed!');
		} else {
			rimraf(directory, function (err) {
				if (err) {
					reject(err);
				} else {
					resolve({directory});
				}
			})
		}
	})
}

function zipDirectory(directory) {
	return new Promise((resolve, reject) => {
		const output = fs.createWriteStream(`${__dirname}/${directory}.zip`);
		const archive = archiver('zip', {
		  zlib: { level: 9 } // Sets the compression level.
		});

		output.on('close', function() {
		  console.log('archiver has been finalized and the output file descriptor has closed.');
		  resolve({directoryPath: directory});
		});

		output.on('end', function() {
		  console.log('Data has been drained');
		});

		archive.on('warning', function(err) {
		  if (err.code === 'ENOENT') {
		    // log warning
		  } else {
		    // throw error
		    throw err;
		  }
		});

		archive.on('error', function(err) {
		  throw err;
		});
		 
		// pipe archive data to the file
		archive.pipe(output);
		archive.directory(`${directory}/`, false)
		archive.finalize();
	})
}

function readFile(filename) {
	return new Promise((resolve, reject) => {
		fs.readFile(filename, function(err, data) {
			if (err) {
				reject(err);
			} else {
				resolve({data, filename});
			}
		})	
	})
}

function uploadBackup(key, fileBuffer) {
	return new Promise((resolve, reject) => {
		const params = {
        Bucket: AWS_BUCKET,
        Key: key,
        Body: fileBuffer,
        ACL: 'public-read'
    }
    s3.putObject(params, function(err, data) {
     if (err) {
     	reject(err)
     } else {
     	resolve({ETag: data.ETag, key});
     }
   });
	})
}

function backupAndUpload() {
	var databaseName;
	console.log('Backing up database to local directory...');
	backupMongo().then(data => {
		databaseName = data.directoryPath;
		console.log('Removing users directory...');
		return removeDirectory(`${databaseName}/users`);
	}).then(data => {
		console.log('Database backed up locally, zipping up directory...');
		return zipDirectory(databaseName);
	}).then(data => {
		console.log('Reading zipped directory...');
		return readFile(`${databaseName}.zip`);
	}).then(data => {
		console.log('Uploading zipped directory to S3...')
		return uploadBackup(data.filename, data.data);
	}).then(data => {
		console.log(`Finished uploading (${data.key}) to S3. ETag: ${data.ETag}`);
		console.log(`Removing backup directory...`);
		return removeDirectory(databaseName);
	}).then(data => {
		console.log('Removing zipped directory...')
		return removeDirectory(`${databaseName}.zip`);
	}).then(data => {
		console.log('Finished!');
	})
	.catch(err => {
		console.log(err);
	})
}

backupAndUpload();
