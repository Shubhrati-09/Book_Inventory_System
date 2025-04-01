import express from 'express';
import passport from 'passport';
import flash from 'express-flash';
import session from 'express-session';
import methodOverride from 'method-override';
import bodyparser from 'body-parser';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import { initializePassport } from './passport-config.js';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// // Load environment variables
// dotenv.config();

// Create a MySQL connection
const mysqlConnection = mysql.createConnection({
  host: 'localhost',
  user: process.env.db_user_name,
  password: process.env.db_password,
  database: process.env.db_name
});

// Connect to the database
mysqlConnection.connect((err) => {
  if (!err) {
    console.log('DB connection succeeded');
  } else {
    console.log('DB connection failed \n Error :' + JSON.stringify(err, undefined, 2));
  }
});

// Set up the app
const app = express();
const port = process.env.PORT || 4000;

// Middleware setup
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

const users = []

users.push({
  id: Date.now().toString(),
  name: 'Admin',
  email: process.env.login_id,
  password: process.env.login_password
}) 

// Initialize Passport
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
);

// Routes
app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs');
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs');
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Middleware to check if the user is authenticated
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Middleware to check if the user is not authenticated
function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}
