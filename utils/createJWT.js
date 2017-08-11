var moment = require('moment');
var jwt = require('jwt-simple');

module.exports = function(user, secret) {
    var payload = {
        sub: user.id,
        iat: moment().unix(),
        exp: moment().add(14, 'days').unix()
    };
    return jwt.encode(payload, secret);
};
