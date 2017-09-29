var socket;
var rtj;
(function(){
	var getNode = function(s){
		return document.querySelector(s);
	};
	
	//get required nodes
	var lobby = getNode('.lobby');
	var messages = getNode('.lobby-messages');
	 
	try{
		socket = io();
	}catch(e){
	}
	if(socket !== 'undefined'){
		
		socket.on('outputLobby',function(data){
			// When we get a 'outputLobby' emit signal from the server.
			// we will print the contents of the emit to the client.
			if(data.length){ 
				//if the emit has contents
				messages.innerHTML = "";
				var count = 0;// count to determine which background to use
				for(var x=0;x<data.length;x++){
					
					// get the join modal div
					var divinModal = document.getElementById('roomNameInModal')
					//create a button to show the modal
					var btn = document.createElement('BUTTON');
					btn.setAttribute("type", "submit");
					btn.setAttribute('id', data[x].roomID);
					btn.setAttribute('class', 'join-btn');
					btn.textContent = "Join";
					btn.onclick = function(){
						modal3.style.display = "block";
						rtj = this.id;
						divinModal.setAttribute('value', rtj);
					};
					
					
					// create a new lobby message div
					var message = document.createElement('div');
					message.setAttribute('class','lobby-message');
					message.setAttribute('id','room_'+x);
					if(count < 9)
						count++;
					else{
						count=1;
					}
					// set background of div to one of the 10 backgrounds
					message.style.backgroundImage = 'url(/views/img/'+ count +'.jpg)';
					message.style.backgroundSize = 'cover';
					message.textContent = data[x].roomName;
					// append the button to the new lobby message
					message.appendChild(btn);
					//Append the new lobby message to the room list
					messages.appendChild(message);
					messages.insertBefore(message, messages.firstChild);
				}
			}
		});
	}
})();



