var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
// Use express `session` and `cookieParser`
app.use(session({
  secret: 'keyboard cat'
}));
app.use(cookieParser());


app.get('/', function(req, res) {
  // 
  // console.log(req.sessionID);

  // If a user is already logged in...
  // res.render('index');

  // else, redirect to the login route
  res.redirect(301, '/login');
});

app.get('/create', function(req, res) {
  // res.render('index');

  res.redirect(301, '/login');
});

app.get('/links', function(req, res) {
  // Links.reset().fetch().then(function(links) {
  //   res.send(200, links.models);
  // });

  res.redirect(301, '/login');
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Log In routes
/************************************************************/
app.get('/login', function(req, res) {
  res.render('login');
});


/************************************************************/
// Sign Up Routes
/************************************************************/
app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var user = new User({
    username: req.body.username,
    password: req.body.password
  });

  User.checkUserExists(req.body.username).then(function(exists) {
    if (exists) {
      res.end('user already exists');
    } else {
      user.hashPassword(req.body.password).then(function() {
        user.save().then(function(user) {
          User.login(req.body.username, req.body.password).then(function(val) {
            // new user signed up and logged in, redirecting home
            res.redirect(301, '/');
          }).catch(function(err) {
            res.end(err);
          });
        });
      });
    }
  }).catch(function(err) {
    console.log(err);
    res.end(); // 500 error?
  });


});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
