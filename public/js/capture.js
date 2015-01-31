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

  // fonctions
  fluxWebcam();
  captureVideo();

	/**
	* handlers
	*/
	/* sockets */

	function onSocketConnect() {
		sessionId = socket.io.engine.id;
		console.log('Connected ' + sessionId);
		socket.emit('newUser', {id: sessionId, name: app.session});
	};
	function onSocketError(reason) {
		console.log('Unable to connect to server', reason);
	};

  function captureVideo(){
    var image = document.getElementById('photo');
    var video = document.getElementById('video');
    var record = document.getElementById('record-btn');
    var play = document.getElementById('play-btn');
    var reset = document.getElementById('reset');
    var save = document.getElementById('save-video');
    var recorder;

    getUserMedia(function (err, stream) {
      if (err) return console.log(err);

      attachMediaStream(stream, video, {muted: true});

      recorder = window.recorder = new VideoRecorder(video);
    });

    record.addEventListener('click', function () {
      if (recorder.running) {
        recorder.stop();
        this.innerHTML = 'Record';
      } else {
        recorder.record();
        this.innerHTML = 'Pause';
      }
    });

    play.addEventListener('click', function () {
      fauxplay(recorder.data, image, {loop: true, duration: recorder.runningTime})
    });

    save.addEventListener('click', function () {
      socket.emit('saveVideo', {data: recorder.data, id: sessionId, name: app.session});
    });

    reset.addEventListener('click', function () {
      recorder.stop();
      recorder.reset();
    });
  }

  function fluxWebcam(){
    var streaming = false,
      video        = document.querySelector('#video'),
      canvas       = document.querySelector('#canvas'),
      photo        = document.querySelector('#photo'),
      startbutton  = document.querySelector('#capture-btn'),
      width = 520,
      height = 0;

    navigator.getMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);
    navigator.getMedia(
    {
      video: true,
      audio: false
    },
    function(stream) {
      if (navigator.mozGetUserMedia) {
        video.mozSrcObject = stream;
      } else {
        var vendorURL = window.URL || window.webkitURL;
        video.src = vendorURL.createObjectURL(stream);
      }
      video.play();
    },
    function(err) {
      console.log("An error occured! " + err);
    }
  );

  video.addEventListener('canplay', function(ev){
    if (!streaming) {
      height = video.videoHeight / (video.videoWidth/width);
      video.setAttribute('width', width);
      video.setAttribute('height', height);
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);
      streaming = true;
    }
  }, false);

  function takepicture() {
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    var data = canvas.toDataURL('image/png');
    photo.setAttribute('src', data);
    socket.emit('imageCapture', {data: data, id: sessionId, name: app.session});
  }

  startbutton.addEventListener('click', function(ev){
      takepicture();
    ev.preventDefault();
  }, false);

  }
  
});