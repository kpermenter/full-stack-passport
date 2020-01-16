const express = require('express');
const router = express.Router();

cookieParser = require('cookie-parser'),
cookieSession = require('cookie-session');

const session = require("express-session");
const bodyParser = require("body-parser");
require('dotenv').config();
const models = require('../models');

var pbkdf2 = require('pbkdf2');
var salt = process.env.SALT_KEY;

function encryptionPassword(password) {
  var key = pbkdf2.pbkdf2Sync(
    password, salt, 36000, 256, 'sha256'
  );
  var hash = key.toString('hex')
  return hash;
}

router.use(session({
  secret: "cats",
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

//////ROUTES///
router.post('/login', passport.authenticate('local', {
  successRedirect: '/articles',
  failureRedirect: '/error'
}));

router.get('/', (req, res) =>
  (res.redirect('/login')));

router.get('/login', function (req, res) {
  res.render('articles/login');
})

router.get('/sign-up', function (req, res) {
  res.render('articles/sign-up');
})

router.post("/sign-up", function (req, res) {
  models.users.create({
    username: req.body.username,
    password: encryptionPassword(req.body.password)
  })
    .then(function (users) {
      res.redirect('/articles');
    });
});

router.get('/logout', function (req, res) {
  if (req.isAuthenticated()) {
    console.log("user logging out");
    req.logOut();
    res.send("user has logged out");
  } else {
    res.send("You don't have a session open");
  }
});

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


/* PASSPORT OAUTH AUTHENTICATION */

var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: "976212040028-hcigl64nfd0vd5u1o1o2qp2arq9qlpde.apps.googleusercontent.com",
  clientSecret: "ItHOI71SKWqzgEjSvLGusns8",
  callbackURL: "http://localhost:8080/auth/google/callback",
  passReqToCallback: true
},
  function (request, accessToken, refreshToken, profile, done) {
    models.users.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

// GET /auth/google
router.get('/auth/google',
  passport.authenticate('google', {
    scope:
    ['profile']
      // ['https://www.googleapis.com/auth/plus.login',
      //   , 'https://www.googleapis.com/auth/plus.profile.emails.read']
  }
  ));

// GET /auth/google callback
router.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/articles',
    failureRedirect: '/login'
  }));

// END OAUTH
//////////////////////////////////////////////////////////////


module.exports = router;