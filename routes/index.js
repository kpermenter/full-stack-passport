require('dotenv').config();
const express = require('express');
const router = express.Router();

const session = require("express-session");
const bodyParser = require("body-parser");
const models = require('../models');
const Article = require('../models').Article;

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

/* TRY CATCH Handler function to wrap each route. */
function asyncHandler(cb) {
  return async (req, res, next) => {
    try {
      await cb(req, res, next)
    } catch (error) {
      res.status(500).send(error);
    }
  }
}

/* GET articles listing. */
router.get('/articles', asyncHandler(async (req, res) => {
  const articles = await Article.findAll({ order: [["createdAt", "DESC"]] });
  res.render("articles/index", { articles, title: "" });
}));

/* Create a new article form. */
router.get('/articles/new', (req, res) => {
  // render new view, empty article Object
  res.render("articles/new", { article: {}, title: "New Article" });
});

/* POST create article. */
router.post('/articles/new', asyncHandler(async (req, res) => {
  // create row in article table(model) -- req.body = mapped key/value pairs
  let article;
  try {
    article = await Article.create(req.body);
    res.redirect("/articles/" + article.id);
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      article = await Article.build(req.body);
      res.render("articles/new", { article, errors: error.errors, title: "New Article" })
    } else {
      throw error;
    }
  }
}));

/* Edit article form. */
router.get("/articles/:id/edit", asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id);
  if (article) {
    res.render("articles/edit", { article: article, title: "Edit Article" });
  } else {
    res.sendStatus(404);
  }
}));

/* GET individual article. */
router.get("/articles/:id", asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id);
  if (article) {
    res.render("articles/show", { article: article, title: article.title });
  } else {
    res.sendStatus(404);
  }
}));

/* Update an article. */
router.post('/articles/:id/edit', asyncHandler(async (req, res) => {
  let article;
  try {
    article = await Article.findByPk(req.params.id);
    if (article) {
      await article.update(req.body);
      res.redirect("/articles/" + article.id);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      article = await Article.build(req.body);
      article.id = req.params.id;
      res.render("articles/edit", { article, errors: error.errors, title: "Edit Article" })
    } else {
      throw error;
    }
  }
}));

/* Delete article form. */
router.get("/articles/:id/delete", asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id);
  if (article) {
    res.render("articles/delete", { article: article, title: "Delete Article" });
  } else {
    res.sendStatus(404);
  }
}));

/* Delete individual article. */
router.post('/articles/:id/delete', asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id);
  if (article) {
    await article.destroy();
    res.redirect("/articles");
  } else {
    res.sendStatus(404);
  }
}));


module.exports = router;