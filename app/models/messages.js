var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
	roomID       : String,
	userID		 : String,
	content		 : String
	
});