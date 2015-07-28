var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  
  tableName: 'users',

  hasTimestamps: true,

  initialize: function() {
    this.on('creating', this.validateSave);
  },

  validateSave: function() {
    // var hash = bcrypt.hashSync(this.attributes.password, null);
    
    // this.set({
    //   password: hash
    // });

    return;
  },

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

  checkUserExists: Promise.method(function(username) {
    return new this({username: username}).fetch({require: true}).then(function() {
      return true;
    }).catch(function(err) {
      return false;
    });
  }),

  login: Promise.method(function(username, password) {
    return new this({username: username}).fetch({require: true}).then(function(user) {

      console.log(user.get('password'), password);

      return bcrypt.compare(password, user.get('password'), function(err, isSame) {
        console.log('-----------------', isSame);
      });
    }).catch(function(err) {
      console.log(err);
    });
  })

});

module.exports = User;