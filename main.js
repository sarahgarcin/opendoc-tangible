var fs = require('fs-extra'),
		glob = require("glob"),
		path = require("path"),
		gm = require('gm'),
		markdown = require( "markdown" ).markdown,
		exec = require('child_process').exec,
		phantom = require('phantom');

var uploadDir = '/uploads';


module.exports = function(app, io){

	console.log("main module initialized");
	var sessions_p = "sessions/";

	io.on("connection", function(socket){
		socket.on("newUser", onNewUser);
		socket.on("newUserSelect", onNewUserSelect);
		socket.on("newSession", addNewSession);
		socket.on("imageCapture", onNewImage);
		socket.on("saveVideo", onNewVideo);
	});

	// events

	function onNewUser(req){
		console.log(req);
		// listSessions();		
	};

	function onNewUserSelect(req){
		listImages(req);
	}

	//ajoute les images au dossier de session
	function onNewImage(req) {

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

		var imageBuffer = decodeBase64Image(req.data);
		console.log(imageBuffer);
		filename = 'sessions/' + req.name + '/' + Date.now() + '.jpg';
		fs.writeFile(filename , imageBuffer.data, function(err) { 
			console.log(err);
		});

	}

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
		var fileName = 'sessions/sessions.json';
		fs.writeFile(fileName, JSON.stringify(session.list), function (err){ 
            console.log(err);
        });
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

	function onNewVideo(req) {
		

	}



  // helpers
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