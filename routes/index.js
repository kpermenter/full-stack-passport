require('dotenv').config();
const express = require('express');
const router = express.Router();

const session = require("express-session");
const bodyParser = require("body-parser");
require('dotenv').config();
const models = require('../models');
var user = require('../models/users.js');

var pbkdf2 = require('pbkdf2');
var salt = process.env.SALT_KEY;

function encryptionPassword(password) {
  var key = pbkdf2.pbkdf2Sync(
    password, salt, 36000, 256, 'sha256'
  );
  var hash = key.toString('hex')
  return hash;
}

// SESSION SETUP
router.use(session({
  secret: process.env.secret,
  resave: false,
  saveUninitialized: true
}));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.use(express.static(__dirname + '/public'));


/*  PASSPORT SETUP  */
const passport = require('passport');
router.use(passport.initialize());
router.use(passport.session());

passport.serializeUser(function (users, cb) {
  cb(null, users.id);
});

passport.deserializeUser(function (id, cb) {
  models.users.findOne({ where: { id: id } }).then(function (users) {
    cb(null, users);
  });
});


/* PASSPORT LOCAL AUTHENTICATION */
const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
}, function (username, password, done) {
    models.users.findOne({
      where: {
        username: username
      }
    }).then(function (users) {
      if (!users) {
        return done(null, false);
      }
      if (users.password != encryptionPassword(password)) {
        return done(null, false);
      }
      return done(null, users);
    }).catch(function (err) {
      return done(err);
    });
  }
));

//post login
router.post('/login', passport.authenticate('local', {
  successRedirect: '/articles',
  failureRedirect: '/error'
}));

//render homepage -> redirect login
router.get('/', (req, res) =>
  (res.redirect('/login')));

//render login
router.get('/login', function (req, res) {
  res.render('articles/login');
})

//render sign up
router.get('/sign-up', function (req, res) {
  res.render('articles/sign-up');
})

//sign up credentials
router.post("/sign-up", function (req, res) {
  models.users.create({
    username: req.body.username,
    password: encryptionPassword(req.body.password)
  })
    .then(function (users) {
      res.redirect('/articles');
    });
});

//logout method
router.get('/logout', function (req, res) {
  if (req.isAuthenticated()) {
    req.logOut();
    res.render('logout')
  } else {
    res.send("You don't have a session open");
  }
});

//error handlers
router.get('/success', function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect('/articles')
  } else {
    res.send("not authorized.");
  }
});

router.get('/error', function (req,res) {
  res.render('passport-error')
})


/* PASSPORT GOOGLE OAUTH*/
var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.clientID,
  clientSecret: process.env.clientSecret,
  callbackURL: "http://localhost:8080/auth/google/callback",
},
function(accessToken, refreshToken, profile, done) {
  models.users.findOne({
    where: {
      'g_id': profile.id
    }
  }).then((currentUser) => {
    if (currentUser) {
      // console.log("welcome back " + profile.displayName);
      done(null, currentUser);
    } else {
      models.users.create({
        g_name: profile.displayName,
        g_id: profile.id
      }).then((newUser) => {
        console.log("New User created: " + newUser);
        done(null, newUser);
      });
    }
  });
}));

// GET /auth/google
router.get('/auth/google',
  passport.authenticate('google', {
    scope:
    ['https://www.googleapis.com/auth/userinfo.profile',]
  }
  ));

// GET /auth/google callback
router.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/articles',
    failureRedirect: '/login'
  }));


module.exports = router;