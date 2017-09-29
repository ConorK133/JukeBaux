 var ytApiKey = "AIzaSyAUjJ27R1IVaUQDhUVB3yc6FIaIbGVpB1Q";
 var toReturn;

  // 2. This code loads the IFrame Player API code asynchronously.
  var tag = document.createElement('script');

  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // 3. This function creates an <iframe> (and YouTube player)
  //    after the API code downloads.
  var player;
  function onYouTubeIframeAPIReady() {
	  player = new YT.Player('iframe', {
		  height: '100%',
		  width: '100%',
		  videoId: '	',
		  playerVars: { 
			  'autoplay': 1, 
			  'controls': 0,
			  'disablekb': 0,
			  'rel': 0 },
		  events: {
		    'onReady': onPlayerReady,
		    'onStateChange': onPlayerStateChange
		  }
	  });
  }

  // 4. The API will call this function when the video player is ready.
  function onPlayerReady(event) {
    socket.emit('playerReady', {player: player,
      	  							room: roomID});
      }
   // when video ends
  function onPlayerStateChange(event) {        
      if(event.data === 0) {          
    	  var currVid = player.getVideoData()['video_id'];
  
		  // The video ends, we let the server know
		  socket.emit('vidEnd', {
        	  video: currVid,
        	  room: roomID
          });
      }
  }
  
  //function that emits a new vote to the server
  function countvote(url){
	  socket.emit('vote', {
		  url: url,
		  room: roomID
	  });
  };
  
  // function that add a video from the search area to the
  // queue. 
  function searchToQueue(url, name){
	  socket.emit('link', {
		url  : url,
		title: getVidDeets(url, 'title'),
		name : name,
		room : roomID
	  });	  
};
  
function httpGet(theUrl){
	  
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
      xmlHttp.send( null );
      return xmlHttp.responseText;
}
  
  // Play the url provided
function playVidya(url, event){
	  if(player){
		  player.cueVideoById(url, 0);
		  player.playVideo();
	  }    	  
}
  
  // function that uses the Youtube API to get details about the id provided
  // the what variable what I want returned.
function getVidDeets(id,what){
	 
			var toReturn;
			var getURL ="https://www.googleapis.com/youtube/v3/videos?part=id%2Csnippet&id="
	+ id + "&key=" + ytApiKey;
	
	
	
	
	$.ajaxSetup({async: false});
	if(what == 'title'){ // when what i want is a title return the title relating to the id
		var vidData = $.get(getURL, function(data) {
			toReturn = data.items[0].snippet.title;
		});
	}
	
	else if(what == 'tn'){ // when what i want is a thumbnail return the thumbnail relating to the id
		var vidData = $.get(getURL, function(data) {
			toReturn = data.items[0].snippet.thumbnails.medium.url;
			
		});
	}
	else if(what == 'ltn'){// when what i want is a high quality thumbnail return the thumbnail relating to the id
				var vidData = $.get(getURL, function(data) {
					toReturn = data.items[0].snippet.thumbnails.high.url;
					
				});
			}
	$.ajaxSetup({async: true});
	return toReturn;
}
  
  