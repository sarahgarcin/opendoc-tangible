jQuery(document).ready(function($) {

	var serverBaseUrl = document.domain;
	var socket = io.connect(serverBaseUrl);
	var sessionId = '';
  //compteur d'image pour le stop motion
  var countImage = 0;

	/**
	* Events
	*/
	/* sockets */
	socket.on('connect', onSocketConnect);
	socket.on('error', onSocketError);

  // fonctions
  fluxWebcam();
  audioCapture();
  events();

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

  function events(){
    $('#photo').on('click', function(){
      $('.screenshot .canvas-view').show();
      $('.screenshot video').hide();
      $('.btn-choice').children().removeClass('active');
      $(this).addClass('active');
      $('.photo-capture').css('display', 'block');
      $('.video-capture').css('display','none');
      $('.stopmotion-capture').css('display','none');
      $('.audio-capture').css('display','none');
    });
    $('#video-btn').on('click', function(){
      $('.btn-choice').children().removeClass('active');
      $(this).addClass('active');
      $('.photo-capture').css('display', 'none');
      $('.video-capture').css('display','block');
      $('.stopmotion-capture').css('display','none');
      $('.audio-capture').css('display','none');
      audioVideo();
    });
    $('#stopmotion').on('click', function(){
      $('.screenshot .canvas-view').show();
      $('.screenshot #camera-preview').hide();
      $('.btn-choice').children().removeClass('active');
      $(this).addClass('active');
      $('.photo-capture').css('display', 'none');
      $('.video-capture').css('display','none');
      $('.stopmotion-capture').css('display','block');
      $('.audio-capture').css('display','none');
    });
    $('#audio').on('click', function(){
      $('.screenshot #camera-preview').hide();
      $('.btn-choice').children().removeClass('active');
      $(this).addClass('active');
      $('.photo-capture').css('display', 'none');
      $('.video-capture').css('display','none');
      $('.stopmotion-capture').css('display','none');
      $('.audio-capture').css('display','block');
      $('.screenshot #canvas').css('display', 'none');
      $('.right .son').css('display', 'block');
    });
    $('.btn-choice button').on('click', function(){
      $('.btn-choice button').attr("disabled", false);
      $(this).attr("disabled",true);
      $(".form-meta.active").slideUp( "slow" ); 
      $(".form-meta").removeClass('active')
    });
  }

  // Prend des photos et des stop motion
  function fluxWebcam(){
    //définition des variables 
    var streaming = false,
        video        = document.querySelector('#video'),
        canvas       = document.querySelector('#canvas'),
        photo        = document.querySelector('#photo'),
        startbutton  = document.querySelector('#capture-btn'),
        startsm  = document.querySelector('#start-sm'),
        capturesm  = document.querySelector('#capture-sm'),
        stopsm  = document.querySelector('#stop-sm'),
        width = 620,
        height = 0;

    // Initialise getUserMedia
    navigator.getMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);
    navigator.getMedia(
      {
        video: true,
        audio: true
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

    // fonction qui prend des photos et qui les envoie au serveur
    function takepicture() {
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(video, 0, 0, width, height);
      var data = canvas.toDataURL('image/png');
      photo.setAttribute('src', data);
      animateWindows(data, "imageCapture");      
    }

    // fonction qui prend des photos pour le stop motion et qui les envoie au serveur
    function takepictureMotion(dir, count) {
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(video, 0, 0, width, height);
      var data = canvas.toDataURL('image/png');
      photo.setAttribute('src', data);
      socket.emit('imageMotion', {data: data, id: sessionId, name: app.session, dir: dir, count: count});
    }

    function initEvents() {
      // Event bouton prendre une photo
      startbutton.addEventListener('click', function(ev){
          takepicture();
        //ev.preventDefault();
        ev.stopPropagation();
      }, false);

      // Event bouton stop motion
      // Crée un nouveau stop motion + ajoute des images dedans + transforme le stop motion en vidéo
      startsm.addEventListener('click', function(){
        $("#start-sm").hide();
        $("#capture-sm").show();
        $("#stop-sm").show();
        socket.emit('newStopMotion', {id: sessionId, name: app.session});
        socket.on('newStopMotionDirectory', onStopMotionDirectory);
        function onStopMotionDirectory(dir){
          capturesm.addEventListener('click', function(ev){
            countImage ++;
            takepictureMotion(dir, countImage);
            ev.preventDefault();
          }, false);
          stopsm.addEventListener('click', function(ev){
            countImage = 0;
            socket.emit('StopMotion', {id: sessionId, name: app.session, dir: dir});
            $('.screenshot .canvas-view').hide();
            setTimeout(function() {
              $('.screenshot').append("<video src='http://localhost:8080/" + app.session + "/stopmotion.mp4' autoplay='true' controls='true' loop='true' width='620' height='465'></video>"); 
              $(".form-meta").slideDown( "slow" ); 
              $(".form-meta").addClass('active');
              $("#valider").off('click');
              $("#valider").on('click', function(e){
                var titreSM = $('input.titre').val();
                var legendeSM = $('textarea.legende').val();
                var tagsSM = $('input.tags').val();
                socket.emit('stopmotionCapture', {id: sessionId, name: app.session, titre: titreSM, legende: legendeSM, tags: tagsSM, dir: dir});
                $(".form-meta.active").slideUp( "slow" ); 
                $(".form-meta").removeClass('active');
              });
            }, 1000);
            ev.preventDefault();
          }, false);
        }
        
      });
    }
    initEvents();
  }

  //Capture le flux audio
  function audioCapture(){
    var mediaStream = null;
    var startRecording = document.getElementById('start-recording');
    var stopRecording = document.getElementById('stop-recording');
    var cameraPreview = document.getElementById('son');
    var recordAudio;
    startRecording.onclick = function() {
      startRecording.disabled = true;
      startRecording.style.display = "none";
      stopRecording.style.display = "block";
      navigator.getUserMedia({
          audio: true
      }, function(stream) {
          mediaStream = stream;
          recordAudio = RecordRTC(stream, {
              type: 'audio',
              onAudioProcessStarted: function() {
                cameraPreview.src = window.URL.createObjectURL(stream);
                cameraPreview.play();
                cameraPreview.muted = true;
                cameraPreview.controls = true;
              }
          });
          recordAudio.startRecording();
          stopRecording.disabled = false;
      }, function(error) {
          alert(JSON.stringify(error));
      });
    };
    stopRecording.onclick = function() {
        startRecording.disabled = false;
        stopRecording.disabled = true;
        startRecording.style.display = "block";
        stopRecording.style.display = "none";
        cameraPreview.style.display = "block";

        // stop audio recorder
        recordAudio.stopRecording(function(url) {
            // get audio data-URL
            recordAudio.getDataURL(function(audioDataURL) {
                var files = {
                    audio: {
                        type: recordAudio.getBlob().type || 'audio/wav',
                        dataURL: audioDataURL
                    }
                };
                //socket.emit('audio', {files: files, id: sessionId, name: app.session});
                console.log("Audio is recording url " + url);
                cameraPreview.src = url;
                cameraPreview.muted = false;
                cameraPreview.play();
                // $("#son").attr('src', url);
                //document.getElementById('audio-url-preview').innerHTML = '<a href="' + url + '" target="_blank"></a>';
                animateWindows(files, "audioCapture");
                if (mediaStream) mediaStream.stop();
            });
        });
    };
  }  

  //Capture le flux audio et video
  function audioVideo(){
    // you can set it equal to "false" to record only audio
    var recordVideoSeparately = !!navigator.webkitGetUserMedia;
    if (!!navigator.webkitGetUserMedia && !recordVideoSeparately) {
        var cameraPreview = document.getElementById('camera-preview');
        cameraPreview.parentNode.innerHTML = '<audio id="camera-preview" controls style="border: 1px solid rgb(15, 158, 238); width: 94%;"></audio> ';
    }


    var mediaStream = null;
    var startRecording = document.getElementById('record-btn');
    var stopRecording = document.getElementById('stop-btn');
    var cameraPreview = document.getElementById('camera-preview');
    var recordAudio, recordVideo;
    startRecording.onclick = function() {
      startRecording.disabled = true;
      startRecording.style.display = "none";
      stopRecording.style.display = "block";
      navigator.getUserMedia({
          audio: true,
          video: true
      }, function(stream) {
          mediaStream = stream;
          recordAudio = RecordRTC(stream, {
              onAudioProcessStarted: function() {
                recordVideoSeparately && recordVideo.startRecording();
                cameraPreview.src = window.URL.createObjectURL(stream);
                cameraPreview.play();
                cameraPreview.muted = true;
                cameraPreview.controls = false;
              }
          });
          recordVideo = RecordRTC(stream, {
              type: 'video'
          });
          recordAudio.startRecording();
          stopRecording.disabled = false;
      }, function(error) {
          alert(JSON.stringify(error));
      });
    };
    stopRecording.onclick = function() {
        startRecording.disabled = false;
        stopRecording.disabled = true;
        startRecording.style.display = "block";
        stopRecording.style.display = "none";
        cameraPreview.style.display = "block";
        // stop audio recorder
        recordVideoSeparately && recordAudio.stopRecording(function() {
          // stop video recorder
          recordVideo.stopRecording(function() {
              // get audio data-URL
              recordAudio.getDataURL(function(audioDataURL) {
                  // get video data-URL
                  recordVideo.getDataURL(function(videoDataURL) {
                      var files = {
                          audio: {
                              type: recordAudio.getBlob().type || 'audio/wav',
                              dataURL: audioDataURL
                          },
                          video: {
                              type: recordVideo.getBlob().type || 'video/webm',
                              dataURL: videoDataURL
                          }
                      };
                      socket.emit('audioVideo', {files: files, id: sessionId, name: app.session});
                      $('.screenshot .canvas-view').hide();
                      $(".form-meta").slideDown( "slow" ); 
                      $(".form-meta").addClass('active');
                      $("#valider").off('click');
                      if (mediaStream) mediaStream.stop();
                  });
              });
              cameraPreview.src = '';
              cameraPreview.poster = 'http://localhost:8080/ajax-loader.gif';
          });
        });
        // if firefox or if you want to record only audio
        // stop audio recorder
        !recordVideoSeparately && recordAudio.stopRecording(function() {
            // get audio data-URL
            recordAudio.getDataURL(function(audioDataURL) {
                var files = {
                    audio: {
                        type: recordAudio.getBlob().type || 'audio/wav',
                        dataURL: audioDataURL
                    }
                };
                socket.emit('audioVideo', {files: files, id: sessionId, name: app.session});
                if (mediaStream) mediaStream.stop();
            });
            cameraPreview.src = '';
            cameraPreview.poster = 'http://localhost:8080/ajax-loader.gif';
        });
    };
    socket.on('merged', function(fileName, sessionName) {
      href = 'http://localhost:8080/static/' + sessionName + '/audiovideo/' + fileName;
      console.log('got file ' + href);
      cameraPreview.src = href
      cameraPreview.play();
      cameraPreview.muted = false;
      cameraPreview.controls = true;
      $("#valider").on('click', function(e){
        var titreVideo = $('input.titre').val();
        var legendeVideo = $('textarea.legende').val();
        var tagsVideo = $('input.tags').val();
        //Confirme l'enregistrement de la vidéo et envoie les meta données. 
        socket.emit('audioVideoCapture', {file:fileName, id: sessionId, name: app.session, titre: titreVideo, legende: legendeVideo, tags: tagsVideo});
        $(".form-meta input").val("");
        $(".form-meta textarea").val("");
        $(".form-meta.active").slideUp( "slow" ); 
        $(".form-meta").removeClass('active');
      });
    });
    socket.on('ffmpeg-output', function(result) {
        // if (parseInt(result) >= 100) {
        //     progressBar.parentNode.style.display = 'none';
        //     return;
        // }
        // progressBar.parentNode.style.display = 'block';
        // progressBar.value = result;
        // percentage.innerHTML = 'Ffmpeg Progress ' + result + "%";
    });
    socket.on('ffmpeg-error', function(error) {
        alert(error);
    });
  } 

  //animation des fenêtres à la capture
  function animateWindows(data, capture){
    //$('.screenshot .canvas-view').hide();
    $(".right").css('display', 'block');
    $('.left').animate({'left':'7%'}, 'slow');
    $('.right').animate({'left':'52%'}, 'slow', function(){
      $('.right').css('height', "auto");
      $(".form-meta").slideDown( "slow" ); 
      $(".form-meta").addClass('active');
      $("#valider").off('click');
      $("#valider").on('click', function(e){
        var titre = $('input.titre').val();
        var legende = $('textarea.legende').val();
        var tags = $('input.tags').val();
        socket.emit(capture, {data: data, id: sessionId, name: app.session, titre: titre, legende: legende, tags: tags});
        $(".form-meta input").val("");
        $(".form-meta textarea").val("");
        $(".form-meta.active").slideUp( "slow", function(){ 
          $(".form-meta").removeClass('active');
          $('.left').animate({'left':'30%'}, 'slow');
          $('.right').css("z-index", 3).animate({'width':"0px", 'top':'0px', 'left':'95%'}, 500, function(){
            $(this).css('display', 'none');
            $(".count-add-media").animate({'opacity': 1}, 500, function(){
              $(this).fadeOut(700);
            });
          });
        });
      });
    });
  }
  
});