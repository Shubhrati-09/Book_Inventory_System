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
  name: "Owner",
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


// Logout Route
app.delete('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          console.log("Logout Error:", err);
          return res.status(500).send("Error logging out");
      }
      res.redirect('/login'); // Redirect to login page after logout
  });
});

//View Books in Stock
app.get('/inventory', (req, res) => {
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

app.get('/purchaseBook', (req, res) => {
    const query = "SELECT * FROM Purchased_Stock";
    mysqlConnection.query(query, (err, table) => {
        if (err) {
            console.error('Error fetching books:', err.message);
            return res.status(500).send('Error fetching Table');
        }
        res.render('purchaseBook.ejs', { PStocks: table });  // ✅ Passing PStocks correctly
    });
});

// app.post('/purchaseBook',(req,res) => {
//     //Step1-> find the book name in Supplier table
//     const name = req.body.name;
//     const quantity = req.body.quantity;
//     const query="SELECT * FROM SupplierBooks  WHERE Book_Name = ?";
//     //Step2-> if book found, then send the data from that

//     mysqlConnection.query(query,[name],(err,SupplierDetails) => {
//         if (err) {
//             console.error('Error fetching books:', err.message);
//             return res.status(500).send('Error fetching Book Details From Supplier Side');
//         } 

//         if(SupplierDetails.length === 0){
//           return res.redirect(`/purchaseBook?message=${encodeURIComponent("Book is not Available")}`);
//         }
        
//         //if found, check if this book exists in Books table
//         const SupplierID = SupplierDetails[0].SupplierID;
//         const genre = SupplierDetails[0].Book_Genre;
//         const BookID = SupplierDetails[0].BookID;
//         const Price = SupplierDetails[0].Price;
//         const totalAmount = Price * parseInt(quantity);

//         const query1 = "SELECT * FROM Books WHERE Book_Name = ?";
//         mysqlConnection.query(query1,[name],(err,bookDetail) =>{
//             if(bookDetail.length === 0){
//                 //means book not in Our store, so adding
//                 // const Total_Amt = Price*quantity;
//                 const insertQuery = "INSERT INTO Books (BookID, Book_Name, Book_Genre, Quantity,Price,SupplierID) VALUES (?, ?, ?, ?, ?, ?)";
//                 mysqlConnection.query(insertQuery,[BookID,name,genre,quantity,Price,SupplierID],(err) =>{
//                     if(err){
//                         console.log("Error in Inserting New Book into Books Table ",err.message);
//                         return res.status(500).send('Error Inserting Book Details To Books Table');
//                     }
//                 });
//             }
//             else{
//                 const newQuantity = bookDetail[0].quantity + parseInt(quantity);
//                 const updateQuery = "UPDATE Books SET Quantity = ? WHERE Book_Name = ?";
//                 mysqlConnection.query(updateQuery,[newQuantity,name],(err) => {
//                     if(err){
//                         console.log("Error Updating Book in Books ",err.message);
//                     }
//                     // return res.redirect('/purchaseBook');
//                 });
//             }
//         });

//         //inserting this order into Purchase_Stocks Table
//         const AddOrder = "INSERT INTO Purchased_Stock(BookID,Book_Name,Quantity,TotalAmount,SupplierID) VALUES(?, ?, ?, ?, ?)";
//         mysqlConnection.query(AddOrder,[BookID,name,quantity,totalAmount,SupplierID],(err) => {
//             if(err){
//                 console.log("Error Adding Order ",err);
//                 return res.status(500).send('Error Inserting Book Details To Books Table');
//             }
//         });
//         return res.redirect('/purchaseBook');
//     });
//     //Step3-> if not found, alert that book not in stock
// });


app.post('/purchaseBook', (req, res) => {
  const name = req.body.name;
  const quantity = parseInt(req.body.quantity);

  // Step 1: Find the book in SupplierBooks
  const query = "SELECT * FROM SupplierBooks WHERE Book_Name = ?";
  mysqlConnection.query(query, [name], (err, SupplierDetails) => {
      if (err) {
          console.error("Error fetching books:", err.message);
          return res.status(500).send("Error fetching Book Details From Supplier Side");
      }

      if (SupplierDetails.length === 0) {
          return res.redirect(`/purchaseBook?message=${encodeURIComponent("Book is not Available")}`);
      }

      // Book found in SupplierBooks, extract details
      const { SupplierID, Book_Genre: genre, BookID, Price } = SupplierDetails[0];
      const totalAmount = Price * quantity;

      // Step 2: Check if the book exists in the Books table
      const query1 = "SELECT * FROM Books WHERE Book_Name = ?";
      mysqlConnection.query(query1, [name], (err, bookDetail) => {
          if (err) {
              console.error("Error fetching Books table:", err.message);
              return res.status(500).send("Error fetching Books Table");
          }

          if (bookDetail.length === 0) {
              // Book is not in store, insert it
              const insertQuery = "INSERT INTO Books (BookID, Book_Name, Book_Genre, Quantity, Price, SupplierID) VALUES (?, ?, ?, ?, ?, ?)";
              mysqlConnection.query(insertQuery, [BookID, name, genre, quantity, Price, SupplierID], (err) => {
                  if (err) {
                      console.error("Error inserting book into Books table:", err.message);
                      return res.status(500).send("Error inserting Book into Books Table");
                  }
                  console.log("New Book inserted successfully.");
                  insertIntoPurchasedStock();
              });
          } else {
              // Book already exists, update quantity
              const newQuantity = bookDetail[0].Quantity + quantity;
              const updateQuery = "UPDATE Books SET Quantity = ? WHERE Book_Name = ?";
              mysqlConnection.query(updateQuery, [newQuantity, name], (err) => {
                  if (err) {
                      console.error("Error updating book quantity in Books table:", err.message);
                      return res.status(500).send("Error updating Book Quantity");
                  }
                  console.log("Book quantity updated successfully.");
                  insertIntoPurchasedStock();
              });
          }
      });

      // Step 3: Insert order into Purchased_Stock table
      function insertIntoPurchasedStock() {
          const AddOrder = "INSERT INTO Purchased_Stock (BookID, Book_Name, Quantity, TotalAmount, SupplierID) VALUES (?, ?, ?, ?, ?)";
          mysqlConnection.query(AddOrder, [BookID, name, quantity, totalAmount, SupplierID], (err) => {
              if (err) {
                  console.error("Error inserting order into Purchased_Stock:", err.message);
                  return res.status(500).send("Error inserting Order into Purchased_Stock Table");
              }
              console.log("Order added to Purchased_Stock successfully.");
              return res.redirect("/purchaseBook");
          });
      }
  });
});
