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
	var sessions_p = "sessions/";
	var session_list = [];

	io.on("connection", function(socket){
		socket.on("newUser", onNewUser);
		socket.on("newUserSelect", onNewUserSelect);
		socket.on("newSession", addNewSession);
		socket.on("imageCapture", onNewImage);
		socket.on("newStopMotion", onNewStopMotion);
		socket.on("imageMotion", onNewImageMotion);
		socket.on("StopMotion", onStopMotion);
		socket.on("stopmotionCapture", onStopMotionCapture);
		socket.on("videoCapture", onNewVideo);
		// socket.on("sonCapture", onNewSon);
		//socket.on("saveVideo", SaveVideo);
	});

	// events

	function onNewUser(req){
		console.log(req);
		//listSessions();		
	};

	function onNewUserSelect(req){
		listImages(req);
	}

	//ajoute les images au dossier de session
	function onNewImage(req) {
		var imageBuffer = decodeBase64Image(req.data);
		currentDate = Date.now();
		filename = 'sessions/' + req.name + '/' + currentDate + '.jpg';
		fs.writeFile(filename , imageBuffer.data, function(err) { 
			console.log(err);
		});
		
		filetext = 'sessions/' + req.name + '/' +req.name+'.json';
		var objectJson = {"images":[{ "name" : currentDate, "titre" : req.titre, "légende" : req.legende, "tags" : req.tags}]};
		if(!fs.existsSync(filetext)){
			jsonString = JSON.stringify(objectJson);
			fs.appendFile(filetext, jsonString, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
        }
	    });
		}
		else {
			jsonAdd = [{ "name" : currentDate, "titre" : req.titre, "légende" : req.legende, "tags" : req.tags}];
			objectJson["images"] = jsonAdd;
			fs.appendFile(filetext, JSON.stringify(objectJson["images"]), function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
        }
	    });
		}
		
		// var filemeta = filename + '.txt';
		// console.log(req.legende + " " + req.tags);
		// fs.writeFile(filemeta, JSON.stringify('{titre: ' + req.titre + '}{légende: '+ req.legende + '}{tags: ' + req.tags +'}' ), function (err){ // Écrire dans les notes + timestamp + user dans un fichier json
  //           console.log(err);
  //       });
	}

	//Liste les images sur la page select
	function listImages(req){
		var dir = "sessions/" + req.name ;
		fs.readdir( dir, function (err, files) {
			if (err)
			throw err;
			for (var index in files) {
				files.splice(index, 1)
				io.sockets.emit('listImages', files);
			}
		});
	}

	//Ajoute le dossier de la session + l'ajouter à la liste des sessions
	function addNewSession(session) {
    var sessionPath = 'sessions/'+session.name;
		fs.ensureDirSync(sessionPath);

		// console.log(session.name);
		// session_list.push(session.name);
		// var fileName = 'sessions/sessions.json';
		// fs.writeFile(fileName, JSON.stringify(session_list), function (err){ 
  	//          console.log(err);
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

	function onNewVideo(req){

	}

	//Crée un dossier vidéo + transforme les images en vidéo
	function SaveVideo(req) {
		rmDir(videoDirectory, false);
		var videoDirectory = 'sessions/' + req.name + '/videos';
		fs.ensureDirSync(videoDirectory);
		var x = 0;
		for(image in req.data) {
			var imageBuffer = decodeBase64Image(req.data[image]);
			x += 1;
			filename = 'sessions/' + req.name + '/videos/img' + x + '.png';
			fs.writeFile(filename , imageBuffer.data, function(err) { 
				console.log(err);
			});
		}
		//make sure you set the correct path to your video file
		var proc = new ffmpeg({ source: videoDirectory + '/img%d.png'})
		  // using 8 fps
		  .fps(8)
		  // setup event handlers
		  .on('end', function() {
		    console.log('file has been converted succesfully');
		  })
		  .on('error', function(err) {
		    console.log('an error happened: ' + err.message);
		  })
		  // save to file
		  .save('sessions/' + req.name + '/' + Date.now() + '.avi');
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
		console.log(req.dir);
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
		var videoPath = 'sessions/' + req.name + '/' + req.titre + '.mp4';
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


		filetext = 'sessions/' + req.name + '/' +req.name+'.json';
		var objectJson = {"videos":[{ "name" : currentDate, "titre" : req.titre, "légende" : req.legende, "tags" : req.tags}]};
		if(!fs.existsSync(filetext)){
			jsonString = JSON.stringify(objectJson);
			fs.appendFile(filetext, jsonString, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
        }
	    });
		}
		else {
			jsonAdd = [{ "name" : currentDate, "titre" : req.titre, "légende" : req.legende, "tags" : req.tags}];
			objectJson["videos"] = jsonAdd;
			fs.appendFile(filetext, JSON.stringify(objectJson["videos"]), function(err) {
	        if(err) {
	            console.log(err);
	        } else {
	            console.log("The file was saved!");
	        }
	    });
		}
	}

	// function onNewSon(req){
	// 	console.log(req.dataURL);
	// 	console.log(req.fileName);
	// 	writeToDisk(req.dataURL, req.fileName, function(err) {
 //      if(err) {
 //          console.log(err);
 //      } else {
 //          console.log("Audio file was saved!");
 //      }
 //    });
	// }


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