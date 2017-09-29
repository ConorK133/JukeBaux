var socket;
var pathArray = window.location.pathname.split( '/' );
var roomID = pathArray[2];
(function(){
	var getNode = function(s){
		return document.querySelector(s);
	};
	
	// getting the required nodes of the elements that we need to
	// write to.
	var messages = getNode('.chat-messages');
	var textarea = getNode('.chat textarea');
	var queuearea = getNode('.queue-messages'); 	
	var usid = document.getElementById('id');
	var search = getNode('.ta-search');
	var searchResults = getNode('.search-results');
	
	function searchByKeyword(query) { // Getting the youtube search results
									  // relating to the query
  	  gapi.client.setApiKey(ytApiKey); //  setting the Youtube API key to authenticate
  	  								   // API queries. ytApiKey can be found in the youtube.js
  	  									// file
  	  gapi.client.load('youtube', 'v3', function() {     
  		  //Load the api
  		// use the api to return a list of youtube searches. 
  		  var request = gapi.client.youtube.search.list({
  			  q: query, // this is the term we search across
  			  part: 'snippet', // this is the part of the request we actually want returned
  			  				// snippet contains all the vital information we need including 
  			  				// the videos ID, title, creator and thumbnail
  			type: 'video', // this ensures that only video results will be returned
  						   // Without this the search can return channels and playlists that
  							// match the query which breaks the print function.
  			  maxResults: '12' // the number of results we want returned.
	    	  });
  		  
	    	  request.execute(function(data) { // execute the search
	    		  printSearch(data); // print the results to the page.
	    	  });
        });
    }
	 
	try{
		socket = io(); // connect to the server socket.
	}catch(e){
	}
	// on first connection to the room the client send a message to the server
	// saying the user has connected. this is then printed to the chat of all
	// connected clients
	var s = usid.textContent + ' has joined the room';
	socket.emit('input', {
		name:'Server',					
		message:s,
		room: roomID 
	});
	if(socket !== 'undefined'){
		
		socket.on('output',function(data){
			// When we get a 'output' emit signal from the server.
			// we will print the contents of the emit to the client.
			if(data.length){ 
				//If the emit has something to print.
				//loop through the content
				for(var x=0;x<data.length;x++){
					if(data[x].room == roomID){
						//create a new message div and append the text from the message 
						// to the div
						var message = document.createElement('div');
						message.setAttribute('class','chat-message');
						message.textContent = data[x].name + ': ' +data[x].message;
						// Append the new div to the chat area.
						messages.appendChild(message);
						messages.insertBefore(message, messages.firstChild);
					}
				}
			}
		});
		
		socket.on('outputQueue',function(data){
			// When we get a 'outputQueue' emit signal from the server.
			// we will print the contents of the emit to the client.
			if(data.res.length>=0){ 
				// if the emit has something to print
				if(data.room == roomID || data.room == 'first'){
				// if the roomID of the emitted data matches that of
				// the current room defined globally above. 
				// that varible will be set when the client first runs
				// this script when they first connect to the room.
				
				
					
				queuearea.innerHTML = ""; // set the queue area to blank before printing to ensure
										  // we dont reprint results.
				for(var x=0;x<data.res.length;x++){
						// we create a new div that will hold the title of the current 
						// queued video..
						var tn = document.createElement("div");
						tn.setAttribute("class", 'textin');
						tn.textContent = getVidDeets(data.res[x].url, 'title');
							
						
						var url = data.res[x].url;
					
						// we create the button that will be used to remove videos 
						// from the queue. The Video's ID is attached to the 
						// button .
						var btn = document.createElement('a');
						var linkText = document.createTextNode("Skip");
						btn.appendChild(linkText);
						btn.setAttribute("id", data.res[x].url);
						btn.setAttribute('class', 'skip-button-left');
						btn.onclick = function(){
							// when the button is clicked we use the countvote function
							// defined below to count a vote on the video
							countvote(this.id);
							$(this).hide(); //hide button locally after counting a vote
											// this means that users cannot vote to remove
											// video more than once
						};
						
						// we create the new queue message div
						var message = document.createElement('div');
						message.setAttribute('class','queue-message');
						
						// set its background to the thumbnail of the video that it represents
						message.style.backgroundImage = 'url('+ getVidDeets(data.res[x].url, 'ltn') +')';
						message.style.backgroundPosition = '50% 50%'; 
						message.style.backgroundSize = '75%';
						// Append the title and the button
						message.appendChild(tn);
						message.appendChild(btn);
						//Append the new queue message to the bottom of the queue area 
						queuearea.appendChild(message);
						queuearea.insertBefore(message, queuearea.firstChild);
					}
				}
				
			}
		});
		
		function printSearch(data){
			// we print the search results gotten from the searchByKeyword function
			// from above and add them to the search area.
			searchResults.innerHTML = "";	//remove any search results that may have been there previously
			var name = usid.textContent;
			for(var i in data.items){
					var item = data.items[i];
					var url = item.id.videoId;
					
					//create a new search result message div.
					var sr = document.createElement('div');
					sr.setAttribute('class','search-message');
					sr.setAttribute("id", item.id.videoId);
					// when the div is click we add the video to the queue using
					// the id of the video the div represents
					sr.onclick = function(){
						searchToQueue(this.id, name);
					};
					// set the background to that of the video that the message
					// represents
					sr.style.backgroundImage = 'url('+ getVidDeets(item.id.videoId, 'ltn') +')';
					sr.style.backgroundPosition = '50% 25%'; 
					sr.textContent = getVidDeets(url, 'title');
					//Append the results to the search result area
					searchResults.appendChild(sr);
					searchResults.lastChild.parentNode.insertBefore(sr, searchResults.lastChild.nextSibling);
				}
		}
		// when we receive an emit from the saying that a new video is ready to be played
		// play the new video.
		socket.on('linkOut', function(data){ 
			if(data[0].room == roomID){
				console.log(" vvvvvvvvvvvvvv" + data[data.length-1].url)
				playVidya(data[data.length-1].url);
			}
			
			
			
		});
		// When we receive a link from the chat or search then emit it to the server to be
		// stored in the database
		socket.on('linkIn', function(data){
			socket.emit('input', {
				name: data.name,
				message: data.message,
				room: roomID
			});
		})
		// event listener for the chat area
		textarea.addEventListener('keydown',function(event){
			var self= this;
			var name = usid.textContent;						
			if(event.which ===13 && event.shiftKey ===false){ // if the button pressed is enter and the shift key
															  // is not being held
				// use jQuery to determine if the message sent is a valid youtube link
				var isyouTubeUrl = /((http|https):\/\/)?(www\.)?(youtube\.com)(\/)?([a-zA-Z0-9\-\.]+)\/?/.test(self.value);
				// if it is
				if(isyouTubeUrl){
					var id = self.value;
					if(isyouTubeUrl){
						//we cut the string to just the id of the video
						var index = self.value.indexOf("?v=");
						id = self.value.substring(index+3);
					}
					// get the videos title
					var inputVidName = getVidDeets(id, 'title');
					// emit to the server as a new video to add to the queue database
					socket.emit('link', {
						url  : id,
						title: inputVidName,
						name : name,
						room : roomID
					});	
				}
				else{// if it is not then we emit to the server as a chat message
					socket.emit('input', {
						name:name,
						message:self.value,
						room : roomID
					});
				}
				
				event.preventDefault();
				textarea.value='';
			} 
		},false);
		// event listener for the search text area
		search.addEventListener('keydown',function(event){
			var self= this;
			var name = usid.textContent;					
			if(event.which ===13){ // if the enter button is hit
				
				 searchByKeyword(self.value); // use the value in the text area as the search query
				
				event.preventDefault();
				search.value='';
			} 
		},false);
	}
})();



