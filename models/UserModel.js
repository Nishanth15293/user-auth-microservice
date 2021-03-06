var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-paginate');

var UserSchema = new mongoose.Schema({
    name:  String,
    email: String,
    password: String,
    phone: String,
    avatarURL: String,
    role: String,
    userActivity: Array,
    updated_at: Date,
    last_login: Date
})

UserSchema.plugin(mongoosePaginate);

UserSchema.methods.toJSON = function(){
    var user = this.toObject();
    delete user.password;

    return user;
};

UserSchema.methods.comparePasswords = function(password, callback) {
    bcrypt.compare(password, this.password, callback);
}

UserSchema.pre('save', function(next){
    var user = this;
    if(!user.isModified('password')) return next();

    bcrypt.genSalt(10, function(err, salt){
        if(err) return next(err);

        bcrypt.hash(user.password, salt, null, function(err, hash){
            if(err) return next(err);

            user.password = hash;
            next();
        })
    })
})

module.exports = mongoose.model('User', UserSchema);
