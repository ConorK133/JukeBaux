var configDB = require('../config/database.js');
module.exports = function(app, passport, mongo) {
	

	//Show HomePage
	app.get('/', isLoggedIn, function(req, res) {
		res.render('lobby.ejs', {
			user : req.user // get the user out of session and pass to template
		});
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/lobby', // redirect to the secure profile section
		failureRedirect : '/login', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));


	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/lobby', // redirect to the secure profile section
		failureRedirect : '/', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// Show the profile page. Uses the isLoggedIn method defined below to ensure the user is 
	// authenticated before allowing access to the page.
	app.get('/profile', isLoggedIn, function(req, res) {
		res.render('profile.ejs', {
			user : req.user // passes the user from the session to the next page.
		});
	});
	
	//process the room creation form.
	app.post('/createroom', function(req, res) {
		
		var name = req.body.roomName;
		var succ;
		
		roomCreate(req, name,req.body.password,function(res2, room){ 
			// if the room is successfully created then redirect to the new room
			if(res2==null){ 
				res.redirect('/room/'+room.roomID);
			}
			// else redirect back to the lobby
			else{
				res.redirect('/lobby');
			}
		});
		
	});
	
	app.param('id', function(req, res, next, id) {
	    req.id = id; //Sets the page side id variable to meet the id created below.
	    next();
	});
	
	// Show the room provided the user is authenticated.
	// room will be rendered whenever the url contains /room/any_string
	// but any_string is checked to see if it exists in the database before
	// rendering the page. If any_string does not exist in the database then
	// you are redirected to the lobby
	app.get('/room/:id', isLoggedIn, function(req, res) {
		mongo.connect(configDB.url,function(err,db) {
			var col= db.collection('roommodels');
			col.findOne({'roomID': req.id}, function(err, document){
				if(document != null){
					res.render('room2.ejs', {
						user : req.user
					});
				}
				else{
					res.render('lobby.ejs', {
						user: req.user
					});
				}
			})
		});
	});
	
	// Process the room join form
	app.post('/roomLogin', function(req, res) {
		
		var name = req.body.roomId;
	
		roomLogin(req, name,req.body.password,function(res2, room){
			if(res2==null){
				res.redirect('/room/'+name);
			}
			else{
				res.redirect('/lobby');
			}
		});
	});
	
	// process the join by ID form
	app.post('/joinLogin', function(req, res) {
		var name = req.body.roomid;
		mongo.connect(configDB.url,function(err,db) {
			var col= db.collection('roommodels');
			
			//we first check if the room provided exists in the database and then we attempt
			// the login. This differs to the post above because the one above will be 
			// explicitly clicking a join button with the roomID attached to the 
			// button itself. Therefore we know the room already exists.
			col.findOne({'roomID': name}, function(err, document){
				if(document != null){
					roomLogin(req, name,req.body.password,function(res2, room){
						//check if the password is correct.
						if(res2==null){
							res.redirect('/room/'+name);
						}
						else{
							res.redirect('/lobby');
						}
					});
				}
				else{
					// If the roomid does not exist we redirect the user to the lobby
					res.redirect('/lobby');
				}
			})
		});		
	});

	//process the logout.
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	//rendering the lobby.
	app.get('/lobby', isLoggedIn, function(req, res) {
		res.render('lobby.ejs', {
			user : req.user // get the user out of session and pass to template
		});
	});
};

// function to check if the user is authenticated before allowing them to proceed to
// the next page.
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	res.render('home.ejs');
	
}


var Room       		= require('../app/models/room');

function roomCreate(req, username, password, done) {
	// First check to see if the room name already exists.
    Room.findOne({ 'roomName' :  username }, function(err, user) {
        // if there are any errors, return the error
        if (err)
            return done('error');

        // check to see if theres already a room with that name.
        if (user) {
            return done('exists', false, function(){
            	
            });
        } else {

			// if there is no room with that name
            // create the new room.
            var newRoom           = new Room();

            // set the rooms details
            newRoom.roomName    = username;
            if(password == "")
            {
            	// If the password field is left blank, which is allowed,
            	// we set a default password, create a hash and save it 
            	// to the new room.
            	newRoom.password = newRoom.generateHash('default');
            }
            else{
            	 // else use the password provided, create a hash and
            	 // save it to the newroom
            	newRoom.password = newRoom.generateHash(password);
            }
            // Creating the ID for the new room. it consists of a random combination of
            // 6 capital letters and digits. there are 36 factorial potential combinations
            // which should be safe for database transactions.
            var id = "";
        	var potential = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 
        					'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 
        					'0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        	while(id.length<6){
        		id = id + potential[Math.floor(Math.random()*35)+1];
        	}
            newRoom.roomID	   = id; // we set the new ID
            newRoom.needsVid   = false; // we default that the new room has no video ready to play
			// save the user
            newRoom.save(function(err) {
                if (err)
                    throw err;
                return done(null, newRoom); // return it
            });
        }

    });

}
function roomLogin(req, username, password, done) { // callback with email and password from our form

    // we check if the room ID exists in the database
    Room.findOne({ 'roomID' :  username }, function(err, user) {
        // if there are any errors, return the error before anything else
        if (err)
            return done(err);

        // if the room id does not exist 
        if (!user){
        	 return done('wrong', false);
        }
           
        if(password == ""){
        	// If the password field is left blank, which is allowed,
        	// we compare the password provided to that in the database using
        	// the validPassword method in the room script
        	if (!user.validPassword('default')){
        		return done('wrong', false); 	
        	}        
        }
        else{
        	if (!user.validPassword(password)){
        		 return done('wrong', false);
        	}
        }    
        // all is well, return successful user
        return done(null, user);
    });
}
