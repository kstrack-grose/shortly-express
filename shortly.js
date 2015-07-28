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

// Use express `session`
app.use(session({
  secret: 'keyboard cat'
}));

// Define a user
var currentUserId;


app.get('/', function(req, res) {
  if (req.session.secret) {
    if (!currentUserId) {
      currentUserId = new User({username: req.session.secret}).fetch().then(function(model) {
        res.render('index');
        currentUserId = model.get('id');
      });
    } else {
      res.render('index');
      console.log(currentUserId);
    }
  } else {
    currentUserId = null
    res.redirect(301, '/login');
  }
});

app.get('/create', function(req, res) {
  if (req.session.secret) {
    res.render('index');
  } else {
    res.redirect(301, '/login');
  }
});

app.get('/links', function(req, res) {
  if (req.session.secret) {
    Links.reset().query('where', 'user_id', '=', currentUserId).fetch().then(function(links) {
      res.send(200, links.models);
    });
  } else {
    res.redirect(301, '/login');
  }
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
          user_id: currentUserId,
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
// Login/logout routes
/************************************************************/
app.get('/login', function(req, res) {
  if (req.session.secret) {
    res.redirect(301, '/');
  } else {
    res.render('login');
  }
});

app.post('/login', function(req, res) {
  
  User.login(req.body.username, req.body.password, function(valid) {
    if (!valid) {
      console.log('invalid');
      res.redirect(301, '/login');
    } else {
      req.session.secret = req.body.username;

      req.session.save(function(err) {
        // session saved
        res.redirect(301, '/');
      })
    }
  });


});

app.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
    res.redirect(301, '/login');
  });
});


/************************************************************/
// Sign Up Routes
/************************************************************/
app.get('/signup', function(req, res) {
  if (req.session.secret) {
    res.redirect(301, '/');
  } else {
    res.render('signup');
  }
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
          User.login(req.body.username, req.body.password, function(valid) {
            if (!valid) {
              console.log('invalid');
              res.send('invalid');
            } else {
              req.session.secret = req.body.username;

              req.session.save(function(err) {
                // session saved
                res.redirect(301, '/');
              })
            }
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
