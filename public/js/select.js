jQuery(document).ready(function($) {

	var serverBaseUrl = document.domain;
	var socket = io.connect(serverBaseUrl);
	var sessionId = '';

	/**
	* Events
	*/
	/* sockets */
	socket.on('connect', onSocketConnect);
	socket.on('error', onSocketError);
	socket.on('listImages', ondisplayImage);

	/**
	* handlers
	*/
	/* sockets */


	function onSocketConnect() {
		sessionId = socket.io.engine.id;
		console.log('Connected ' + sessionId);
		socket.emit('newUserSelect', {id: sessionId, name: app.session});
	};
	function onSocketError(reason) {
		console.log('Unable to connect to server', reason);
	};

	function ondisplayImage(images){
		console.log(images);
		for(var i=0; i<images.length; i++) {
        	$('.buffer ul').append("<li><img src='http://localhost:8080/" + app.session + "/" + images[i] + "'></li>");
        }
	}

});