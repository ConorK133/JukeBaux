var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var roomSchema = mongoose.Schema({

        roomID       : String,
        roomName	 : String,
        password     : String,
        needsVid	 : Boolean

});

// generates a hash of the password entered
roomSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
roomSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


module.exports = mongoose.model('RoomModel', roomSchema);
