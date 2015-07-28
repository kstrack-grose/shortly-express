var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  
  tableName: 'users',

  hasTimestamps: true,

  hashPassword: Promise.method(function(password) {
    return bcrypt.hash(password, null, null, function(err, password) {
      if (err) throw err;

      this.set({
        password: password
      });

      return;
    }.bind(this));
  })

}, {
  
  login: function(username, password, callback) {
    if (!username || !password) throw new Error('Email and password are both required');

    return new this({username: username}).fetch({require: true}).tap(function(user) {
      bcrypt.compare(password, user.get('password'), function(err, res) {
        callback(res);
      });
    });
  }

});

module.exports = User;