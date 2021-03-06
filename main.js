var fs = require('fs-extra'),
		glob = require("glob"),
		path = require("path"),
		gm = require('gm'),
		markdown = require( "markdown" ).markdown,
		exec = require('child_process').exec,
		phantom = require('phantom'),
		ffmpeg = require('fluent-ffmpeg')
		sprintf = require("sprintf-js").sprintf,
    vsprintf = require("sprintf-js").vsprintf;

var uploadDir = '/uploads';


module.exports = function(app, io){

	console.log("main module initialized");

	// VARIABLES
	var sessions_p = "sessions/";
	var session_list = [];
	currentDate = Date.now();

	io.on("connection", function(socket){
		socket.on("newUser", onNewUser);
		socket.on("newUserSelect", onNewUserSelect);
		socket.on("newSession", addNewSession);
		socket.on("imageCapture", onNewImage);
		socket.on("newStopMotion", onNewStopMotion);
		socket.on("imageMotion", onNewImageMotion);
		socket.on("StopMotion", onStopMotion);
		socket.on("stopmotionCapture", onStopMotionCapture);
		//socket.on("videoCapture", onNewVideo);
		socket.on("audioVideo", onNewAudioVideo);
		socket.on("audioVideoCapture", onNewAudioVideoCapture);
		//socket.on("audio", onNewAudio);
		socket.on("audioCapture", onNewAudioCapture);

	});

	// events

	function onNewUser(req){
		console.log(req);
		//listSessions();		
	};

	function onNewUserSelect(req){
		listMedias(req);
	}

	//Ajoute le dossier de la session + l'ajouter à la liste des sessions
	function addNewSession(session) {
    var sessionPath = 'sessions/'+session.name;
		fs.ensureDirSync(sessionPath);

		var jsonFile = 'sessions/' + session.name + '/' +session.name+'.json';
		var objectJson = {"files": {"images":[], "videos":[], "stopmotion":[], "audio":[]}};
		var jsonString = JSON.stringify(objectJson);
		fs.appendFile(jsonFile, jsonString, function(err) {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }
    });


		// console.log(session.name);
		// session_list.push(session.name);
		// var fileName = 'sessions/sessions.json';
		// fs.writeFile(fileName, JSON.stringify(session_list), function (err){ 
  	//          console.log(err);
		// });
	}

	//ajoute les images au dossier de session
	function onNewImage(req) {
		console.log('test');
		var imageBuffer = decodeBase64Image(req.data);
		currentDate = Date.now();
		filename = 'sessions/' + req.name + '/' + currentDate + '.jpg';
		fs.writeFile(filename , imageBuffer.data, function(err) { 
			console.log(err);
		});
		
		var jsonFile = 'sessions/' + req.name + '/' +req.name+'.json';
		var data = fs.readFileSync(jsonFile,"UTF-8");
		var jsonObj = JSON.parse(data);
		var jsonAdd = { "name" : currentDate, "titre" : req.titre, "légende" : req.legende, "tags" : req.tags};
		jsonObj["files"]["images"].push(jsonAdd);
		fs.writeFile(jsonFile, JSON.stringify(jsonObj), function(err) {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }
    });
	}

	//Liste les medias sur la page select
	function listMedias(req){
		//read json file to send data
		var jsonFile = 'sessions/' + req.name + '/' +req.name+'.json';
		var data = fs.readFileSync(jsonFile,"UTF-8");
		var jsonObj = JSON.parse(data);

		var dir = "sessions/" + req.name ;
		fs.readdir(dir, function(err, files) {
			var media = [];
			if (err) return;
			files.forEach(function(f) {
				media.push(f);
			});
			io.sockets.emit('listMedias', media,jsonObj);
		});
		// fs.readdir(dir, function (err, files) {
		// 	if (err)
		// 	throw err;
		// 	for (var index in files) {
		// 		// console.log(files);
		// 		// files.splice(index, 1);
		// 		var extension = path.extname(files);
		// 		console.log(extension);
		// 		io.sockets.emit('listImages', files);
		// 	}
		// });
	}

	//Liste les dossiers dans sessions/
	function listSessions() {
		var dir = "sessions/";
 			if (err)
    		throw err;
 			for (var index in files) {
    			// console.log(files.splice(index, 1));
    			files.splice(index, 1);
    			io.sockets.emit('listSessions', files);
 			}
	}

	// Crée un nouveau dossier pour le stop motion
	function onNewStopMotion(req) {
		var StopMotionDirectory = 'sessions/' + req.name + '/stopmotion';
		if(StopMotionDirectory){
			fs.removeSync(StopMotionDirectory);
		}
		fs.ensureDirSync(StopMotionDirectory);
		io.sockets.emit('newStopMotionDirectory', StopMotionDirectory);
	}

	// Ajoute des images au dossier du stop motion
	function onNewImageMotion(req) {
		var imageBuffer = decodeBase64Image(req.data);
		filename = req.dir + '/' + req.count + '.png';
		fs.writeFile(filename , imageBuffer.data, function(err) { 
			console.log(err);
		});
	}

	//Transforme les images en vidéos. 
	function onStopMotion(req) {
		//console.log(req.dir);
		var videoPath = 'sessions/' + req.name + '/stopmotion.mp4';
		if(videoPath){
			fs.remove(videoPath);
		}
		//make sure you set the correct path to your video file
		var proc = new ffmpeg({ source: req.dir + '/%d.png'})
		  // using 12 fps
		  .fps(7)
		  // setup event handlers
		  .on('end', function() {
		    console.log('file has been converted succesfully');
		  })
		  .on('error', function(err) {
		    console.log('an error happened: ' + err.message);
		  })
		  // save to file
		  .save(videoPath);
	}

	function onStopMotionCapture(req){
		currentDate = Date.now();
		//SAVE VIDEO
		var videoPath = 'sessions/' + req.name + '/' + currentDate + '.mp4';
		if('sessions/' + req.name + '/stopmotion.mp4'){
			fs.remove('sessions/' + req.name + '/stopmotion.mp4');
		}
		//make sure you set the correct path to your video file
		var proc = new ffmpeg({ source: req.dir + '/%d.png'})
		  // using 12 fps
		  .fps(7)
		  // setup event handlers
		  .on('end', function() {
		    console.log('file has been converted succesfully');
		  })
		  .on('error', function(err) {
		    console.log('an error happened: ' + err.message);
		  })
		  // save to file
		  .save(videoPath);


		var jsonFile = 'sessions/' + req.name + '/' +req.name+'.json';
		var data = fs.readFileSync(jsonFile,"UTF-8");
		var jsonObj = JSON.parse(data);
		var jsonAdd = { "name" : currentDate, "titre" : req.titre, "légende" : req.legende, "tags" : req.tags};
		jsonObj["files"]["stopmotion"].push(jsonAdd);
		fs.writeFile(jsonFile, JSON.stringify(jsonObj), function(err) {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }
    });
	}

	function onNewAudioVideo(data){
    var fileName = currentDate;
    var VideoDirectory = 'sessions/' + data.name + '/audiovideo';
    var sessionDirectory = 'sessions/' + data.name;
		if(VideoDirectory){
			fs.removeSync(VideoDirectory);
		}
		fs.ensureDirSync(VideoDirectory);
    io.sockets.emit('ffmpeg-output', 0);
    writeToDisk(data.files.audio.dataURL, fileName + '.wav', data.name);

    // if it is chrome
    if (data.files.video) {
        writeToDisk(data.files.video.dataURL, fileName + '.webm', data.name);
        merge(fileName, data.name);
    }

    // if it is firefox or if user is recording only audio
    else io.sockets.emit('merged', fileName + '.wav', data.name);
	}

	function writeToDisk(dataURL, fileName, session) {
    var fileExtension = fileName.split('.').pop(),
        fileRootNameWithBase = './sessions/' + session + '/audiovideo/' + fileName,
        filePath = fileRootNameWithBase,
        fileID = 2,
        fileBuffer;

    // @todo return the new filename to client
    while (fs.existsSync(filePath)) {
        filePath = fileRootNameWithBase + '(' + fileID + ').' + fileExtension;
        fileID += 1;
    }

    dataURL = dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    // console.log('filePath', filePath);
	}

	function merge(fileName, session) {
	    var FFmpeg = require('fluent-ffmpeg');

	    var audioFile = path.join(__dirname, 'sessions', session, 'audiovideo', fileName + '.wav'),
	        videoFile = path.join(__dirname, 'sessions', session, 'audiovideo', fileName + '.webm'),
	        mergedFile = path.join(__dirname, 'sessions', session, 'audiovideo', fileName + '-merged.webm');

	    new FFmpeg({
	            source: videoFile
	        })
	        .addInput(audioFile)
	        .on('error', function (err) {
	            io.sockets.emit('ffmpeg-error', 'ffmpeg : An error occurred: ' + err.message);
	        })
	        .on('progress', function (progress) {
	            io.sockets.emit('ffmpeg-output', Math.round(progress.percent));
	        })
	        .on('end', function () {
	            io.sockets.emit('merged', fileName + '-merged.webm', session);
	            console.log('Merging finished !');

	            // removing audio/video files
	            //fs.unlink(audioFile);
	            //fs.unlink(videoFile);
	        })
	        .saveToFile(mergedFile);
	}

	function onNewAudioVideoCapture(req){
		var VideoDirectory = 'sessions/' + req.name + '/audiovideo/';
		var file = req.file.substring(0, 13);
		//move wav file
    var wav = fs.createReadStream(VideoDirectory + file +".wav");
		var newWave = fs.createWriteStream('sessions/' + req.name + '/' + file + ".wav" );
		wav.pipe(newWave);
		//move video file
    var video = fs.createReadStream(VideoDirectory + file +".webm");
		var newVideo = fs.createWriteStream('sessions/' + req.name + '/' + file + ".webm" );
		video.pipe(newVideo);
		//move merge file
    var merge = fs.createReadStream(VideoDirectory + req.file);
		var newMerge = fs.createWriteStream('sessions/' + req.name + '/' + req.file );
		merge.pipe(newMerge);

		//add data to json file
		var jsonFile = 'sessions/' + req.name + '/' +req.name+'.json';
		var data = fs.readFileSync(jsonFile,"UTF-8");
		var jsonObj = JSON.parse(data);
		var jsonAdd = { "name" : currentDate, "titre" : req.titre, "légende" : req.legende, "tags" : req.tags};
		jsonObj["files"]["videos"].push(jsonAdd);
		fs.writeFile(jsonFile, JSON.stringify(jsonObj), function(err) {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }
    });
	}

	function onNewAudioCapture(req){
		//write video to disk
		var fileName = currentDate;
    var fileWithExt = fileName + '.wav';
    var fileExtension = fileWithExt.split('.').pop(),
        fileRootNameWithBase = './sessions/' + req.name +'/'+ fileWithExt,
        filePath = fileRootNameWithBase,
        fileID = 2,
        fileBuffer;

    // @todo return the new filename to client
    while (fs.existsSync(filePath)) {
        filePath = fileRootNameWithBase + '(' + fileID + ').' + fileExtension;
        fileID += 1;
    }

    dataURL = req.data.audio.dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

		//add data to json file
		var jsonFile = 'sessions/' + req.name + '/' +req.name+'.json';
		var data = fs.readFileSync(jsonFile,"UTF-8");
		var jsonObj = JSON.parse(data);
		var jsonAdd = { "name" : currentDate, "titre" : req.titre, "légende" : req.legende, "tags" : req.tags};
		jsonObj["files"]["audio"].push(jsonAdd);
		fs.writeFile(jsonFile, JSON.stringify(jsonObj), function(err) {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }
    });
	}


// helpers

//Décode les images en base64
function decodeBase64Image(dataString) {
	var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
	response = {};

	if (matches.length !== 3) {
		return new Error('Invalid input string');
	}

	response.type = matches[1];
	response.data = new Buffer(matches[2], 'base64');

	return response;
}

//remove all files in directory
//Call rmDir('path/to/dir') to remove all inside dir and dir itself. 
//Call rmDir('path/to/dir', false) to remove all inside, but not dir itself.
rmDir = function(dirPath, removeSelf) {
      if (removeSelf === undefined)
        removeSelf = true;
      try { var files = fs.readdirSync(dirPath); }
      catch(e) { return; }
      if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
          var filePath = dirPath + '/' + files[i];
          if (fs.statSync(filePath).isFile())
            fs.unlinkSync(filePath);
          else
            rmDir(filePath);
        }
      if (removeSelf)
        fs.rmdirSync(dirPath);
    };

  function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
  }
  function timestampToTimer(time){
      var d = new Date(time);
      return pad(d.getHours()   ,2) + ':' + 
             pad(d.getMinutes() ,2) + ':' + 
             pad(d.getSeconds()   ,2);
  }

};