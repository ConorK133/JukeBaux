// Declaring all of our dependancies 
var express  = require('express');
var http 	 = require('http');
var app      = express();
var port     = process.env.PORT || 6001;
var mongoose = require('mongoose');
var passport = require('passport');
var server 	 = http.createServer(app);
var io = require('socket.io').listen(server);
var flash    = require('connect-flash');
var mongo 	 = require('mongodb').MongoClient;
var io 		 = require('socket.io').listen(app.listen(port));




var configDB = require('./config/database.js');

app.use(express.static(__dirname + '/'));
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport);

app.configure(function() {

	// set up our express application
	app.use(express.logger('dev')); 
	app.use(express.cookieParser()); 
	app.use(express.bodyParser()); 

	app.set('view engine', 'ejs'); // set up ejs for templating

	// required for passport
	app.use(express.session({ secret: 'yumyuminthetumtum' })); // session secret
	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions
	app.use(flash()); // use connect-flash for flash messages stored in session

});

//----------------------CHAT STUFF -----------------------------//
var mongo = require('mongodb').MongoClient;

mongo.connect(configDB.url,function(err,db) {
	if(err) throw err;
	io.on('connection',function(socket){
		
		var col= db.collection('messages');
		var queue= db.collection('queue');
		var lobby = db.collection('roommodels')
		
	
		//Emit all messages
		//Force this to all client that is open
		//every client is listening when a new message is inserted
		//we will not retrieve all the message again, we will only get the new message
		col.find().limit(1000000).sort({_id : 1}).toArray(function(err,res){
			if (err) throw err;
			socket.emit('output',res);
		});
		lobby.find().limit(1000).sort({_id : 1}).toArray(function(err,res){
			if (err) throw err;
			socket.emit('outputLobby',res);
		});
		
		//Push First video
		function pushVidOnJoin(room){
			// check to see if the room has a video in the queue
			queue.find({room: room}).sort({_id : -1}).toArray(function(err,res){  
				if (err) throw err;
				
				var nV;
				lobby.find({roomID: room}).sort({_id : 1}).toArray(function(err,res2){
					nV = res2[0].needsVid;
				});
				// if it does, we prompt the client to play it and update the visual queue
				if(res.length > 0){
					socket.emit('linkOut',res);
					io.sockets.emit('outputQueue',{
						res: res,
						room: room
					});
				}
				else{
					lobby.update({roomID: room }, 
							 {$set: {needsVid: true}});
				}
			});
		}
		// difference between these is /\ this one pushes the first video when the client joins
		// 
		// Had to make 2 so that the video would not refresh when a new client joins
		//
		// \/ This one pushes a video to all clients 
		function pushVid(room){
			queue.find({room: room}).sort({_id : -1}).toArray(function(err,res){
				if (err) throw err;
				var nV;
				lobby.find({roomID: room}).sort({_id : 1}).toArray(function(err,res2){
					nV = res2[0].needsVid;
				});
				if(res.length > 0){
					io.sockets.emit('linkOut',res);
					io.sockets.emit('outputQueue',{
						res: res,
						room: room
					});
				}
				else{
					lobby.update({roomID: room }, 
							 {$set: {needsVid: true}});
					io.sockets.emit('outputQueue',{
						res: res,
						room: room
					});
				}
			});

		}
		
		
	
		
		// the server receives a chat input from a client
		socket.on('input', function(data){
			var name = data.name;
			var	message = data.message;
			var room = data.room;
			var	whitespacePattern=/^\s*$/;
	
			// insert the message in the datebase and emit it to all clients
			col.insert({name:name, message:message, room:room},function(){
				io.emit('output',[data])			
			});				
		});
		/*
		 *
		 * Queue and video stuff 
		 * 
		 */
		// when we get a link
		socket.on('link', function(data){
			var url = data.url;
			var title = data.title;
			var user = data.name;
			var room= data.room;
			var nV;
			// we check if the room it came from currently has a needs a video to play
			lobby.find({roomID: room}).sort({_id : 1}).toArray(function(err,res){
				nV = res[0].needsVid;
			});
			var message = ' added ' + title + ' to the queue!';
			socket.emit('linkIn', {
				name:user,
				message:message,
				room : room
			});	 
			// we insert the new video into the database
			queue.insert({url: url,
						  user: data.name,
						  voteCount: 0,
						  room: room}, 
			function(){
				  queue.find({room:room}).limit(100).sort({_id : -1}).toArray(function(err,res){
						if (err) throw err;
						//we update the visual queue with the new video
						io.sockets.emit('outputQueue',{
							res: res,
							room: room
						});
						
						// if the room that sent the link does need a video then we send it to play
						// immediatly 
						if(nV == true){
							io.sockets.emit('linkOut', res);
							lobby.update({roomID: room}, 
									 {$set: {needsVid: false}});
						}
					});
			});
			
		});
		// when the youtube player is ready when a client initially joins a room
		// the server sends that single client the current video to play
		socket.on('playerReady', function(data){
			var nV;
			
			lobby.find({roomID: data.room}).sort({_id : 1}).toArray(function(err,res){
				nV = res[0].needsVid;
			});
			if(nV != true){
				pushVidOnJoin(data.room);
			}

		});
		
		//when the current video ends we delete it from the queue and push the next one.
		socket.on('vidEnd', function(data){
			queue.deleteOne({url: data.video},function(){
				pushVid(data.room);
			});
		});
		
		//when we receive a vote
		socket.on('vote', function(data){
			//get the video that was voted on
			queue.find({url: data.url}).sort({_id : 1}).toArray(function(err,res){
				if (err) throw err;
				// add a vote to that videos current vote count
				var count = res[0].voteCount + 1;
				var votedVid = res[0];
				// if it is less than 2 we update the new count in the database
				if (count < 2){
					queue.update({url: data.url}, 
							 {$set: {voteCount: count}});
				}
				else{ 
					//otherwise we remove it
					queue.find({room: data.room}).sort({_id : -1}).toArray(function(err,res2){
						if (err) throw err;
						if(res2[res2.length-1].url == votedVid.url){ // If vid that is being removed is
																	// the current video of the room the vote came from
							queue.deleteOne({url: data.url},function(){
								// we delete it and push the next video
								pushVid(data.room);
							});
						}
						else{ // if it isnt
							queue.deleteOne({url: data.url},function(){ // delete it 
								
							});
							queue.find({room: data.room}).sort({_id : -1}).toArray(function(err,res3){ // update the queue
								io.sockets.emit('outputQueue',{
									res: res3,
									room: data.room
								});
							});
						}
						
					});		
				}
			});		
		});
	});
});

// routes 
require('./app/routes.js')(app, passport, mongo); 

// launch ======================================================================
console.log('The Application is launched on ');
