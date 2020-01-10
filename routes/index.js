const express = require('express');
const router = express.Router();

const app = express();
const session = require('express-session');
//const passport = require('passport');
const models = require('../models');
require('dotenv').config();


// Passport session
// app.use(session({
//   secret: "cats",
//   resave: false,
//   saveUninitialized: true
// }));

// app.use(passport.initialize());
// app.use(passport.session());

// var cookieParser = require('cookie-parser');
var pbkdf2 = require('pbkdf2');
var salt = process.env.SALT_KEY;

function encryptionPassword(password) {
  var key = pbkdf2.pbkdf2Sync(
    password, salt, 36000, 256, 'sha256'
  );
  var hash = key.toString('hex')
  return hash;
}

// const LocalStrategy = require('passport-local').Strategy

//passport local strategy 
// passport.use(new LocalStrategy(
//   function (username, password, done) {
//     models.users.findOne({
//       where: {
//         username: username
//       }
//     }).then(function (user) {
//       if (!user) {
//         return done(null, false)
//       }

//       if (user.password != encryptionPassword(password)) {

//         return done(null, false);
//       }
//       return done(null, user);
//     }).catch(function (err) {
//       return done(err);
//     });
//   }
// ));

// passport.serializeUser(function (user, done) {
//   done(null, user.id);
// });

// passport.deserializeUser(function (id, done) {
//   models.users.findOne({ where: { id: id } }).then(function (user) {
//     done(null, user);
//   });
// });

/* GET articles homepage */
router.get('/', (req, res, next) => {
  res.redirect("/articles")
});

/* GET sign-up*/
router.get('/sign-up', function (req, res) {
  console.log('hey')
  res.render('articles/sign-up');
})

/* GET login*/
router.get('/login', function (req, res) {
  res.render('articles/login');
})

// POST login
router.post('/login', function (req, res) {
    res.send('called')
})

// POST sign-up
router.post("/sign-up", function (req, res) {
  console.log('helllloooo');
  console.log(req.body.username);
  console.log(req.body.password);
  models.users.findOne({
    where: {
      username: req.body.username
    }
  }).then(function (user) {
    console.log(user)
    if (!user) {
      models.users.create({
        username: req.body.username,
        password: encryptionPassword(req.body.password),

      }).error(function (err) {
        console.log(err);

      });
      res.send('cool')
    } 

    // else {
    //   res.render('articles/sign-up', { error: 'The user is already created ' })
    // }
    // res.redirect("login")
  })

});

// Using LocalStrategy with passport
// router.post('/login',
//   passport.authenticate('local', { failureRedirect: '/error' }),
//   function (req, res) {
//     res.redirect('/success?username=' + req.user.username)
//     res.redirect('/articles')
//   })

router.get('/success', function (req, res) {
  console.log(req.user)
  if (req.isAuthenticated()) {
    res.redirect("/articles");

  } else {
    res.redirect('/sign-up')
  }
});

router.get('/error', function (req, res) {
  res.redirect("/login");
})


module.exports = router;
