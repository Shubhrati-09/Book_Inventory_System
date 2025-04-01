import express from 'express';
import passport from 'passport';
import flash from 'express-flash';
import session from 'express-session';
import methodOverride from 'method-override';
import bodyparser from 'body-parser';
import dotenv from 'dotenv';
import mysql from 'mysql2';
import bcrypt from 'bcrypt';
import { initialize as initializePassport } from './passport-config.js';

dotenv.config(); // Load environment variables

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

// Store user credentials from .env
const users = [{
  id: Date.now().toString(),
  name: "Admin",
  email: process.env.login_id,
  password: process.env.login_password // Ensure this is a **hashed** password in .env
}];

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
  }))

// Middleware to check authentication
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

//View Books in Stock
app.get('/viewStocks', (req, res) => {
    const query = 'SELECT * FROM Books';  // Query to fetch all books from the Books table
  
    mysqlConnection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching books:', err);
        return res.status(500).send('Error fetching books');
      }
      
      // Send results back as a JSON response
      res.render("viewstocks.ejs",{books : results});
    });
});

app.get('/purchaseBook',(req,res) => {
    const query = "SELECT * FROM Supplier";
    res.render('purchaseBook.ejs');
});
