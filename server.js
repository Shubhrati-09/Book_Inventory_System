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



//--------------USER- ADMIN AND OWNER--------------
const users = [
  {
    id: Date.now().toString(),
    name: "Owner",
    email: process.env.login_id,
    password: process.env.login_password 
  },
  {
    id: (Date.now() + 1).toString(),
    name: "Admin",
    email: process.env.admin_login_id, 
    password: process.env.admin_login_password 
  }
];
//-------------------------------------------------


// Initialize Passport
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
);


//--------------------------MIDDLEWARE FUNCTIONS-----------------------------
// Middleware to check is user is Onwer
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.user.email === process.env.login_id) {
    return next();
  }

  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.user.email === process.env.login_id) {
    return res.redirect('/'); // Redirect Owner to home
  }
  next();
}


// Middleware to check if user is Admin
function checkAuthenticatedAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.email === process.env.admin_login_id) {
    return next();
  }
  res.redirect('/login'); // Redirect to login if not admin
}

function checkNotAuthenticatedAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.email === process.env.admin_login_id) {
    return res.redirect('/adminDashboard'); // Redirect Admin to adminDashboard
  }
  next();
}
//----------------------------------------------------------------------------




// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


// Routes
app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs');
});

app.get('/login', [checkNotAuthenticated, checkNotAuthenticatedAdmin], (req, res) => {
  res.render('login.ejs');
});

app.post('/login', [checkNotAuthenticated, checkNotAuthenticatedAdmin], passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  }))

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
app.get('/inventory',checkAuthenticated, (req, res) => {
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

app.get('/purchaseBook',checkAuthenticated, (req, res) => {
    const query = "SELECT * FROM Purchased_Stock";
    mysqlConnection.query(query, (err, table) => {
        if (err) {
            console.error('Error fetching books:', err.message);
            return res.status(500).send('Error fetching Table');
        }
        res.render('purchaseBook.ejs', { PStocks: table });  // ✅ Passing PStocks correctly
    });
});

app.post('/purchaseBook',(req,res) => {
    //Step1-> find the book name in Supplier table
    const name = req.body.name;
    const quantity = req.body.quantity;
    const query="SELECT * FROM SupplierBooks  WHERE Book_Name = ?";
    //Step2-> if book found, then send the data from that

    mysqlConnection.query(query,[name],(err,SupplierDetails) => {
        if (err) {
            console.error('Error fetching books:', err.message);
            return res.status(500).send('Error fetching Book Details From Supplier Side');
        } 

        if(SupplierDetails.length === 0){
          return res.redirect(`/purchaseBook?message=${encodeURIComponent("Book is not Available")}`);
        }
        
        //if found, check if this book exists in Books table
        const SupplierID = SupplierDetails[0].SupplierID;
        const genre = SupplierDetails[0].Book_Genre;
        const BookID = SupplierDetails[0].BookID;
        const Price = SupplierDetails[0].Price;
        const totalAmount = Price * parseInt(quantity);

        const query1 = "SELECT * FROM Books WHERE Book_Name = ?";
        mysqlConnection.query(query1,[name],(err,bookDetail) =>{
            if(bookDetail.length === 0){
                //means book not in Our store, so adding
                // const Total_Amt = Price*quantity;
                const insertQuery = "INSERT INTO Books (BookID, Book_Name, Book_Genre, Quantity,Price,SupplierID) VALUES (?, ?, ?, ?, ?, ?)";
                mysqlConnection.query(insertQuery,[BookID,name,genre,quantity,Price,SupplierID],(err) =>{
                    if(err){
                        console.log("Error in Inserting New Book into Books Table ",err.message);
                        return res.status(500).send('Error Inserting Book Details To Books Table');
                    }
                });
            }
            else{
                const newQuantity = bookDetail[0].quantity + parseInt(quantity);
                const updateQuery = "UPDATE Books SET Quantity = ? WHERE Book_Name = ?";
                mysqlConnection.query(updateQuery,[newQuantity,name],(err) => {
                    if(err){
                        console.log("Error Updating Book in Books ",err.message);
                    }
                    // return res.redirect('/purchaseBook');
                });
            }
        });

        //inserting this order into Purchase_Stocks Table
        const AddOrder = "INSERT INTO Purchased_Stock(BookID,Book_Name,Quantity,TotalAmount,SupplierID) VALUES(?, ?, ?, ?, ?)";
        mysqlConnection.query(AddOrder,[BookID,name,quantity,totalAmount,SupplierID],(err) => {
            if(err){
                console.log("Error Adding Order ",err);
                return res.status(500).send('Error Inserting Book Details To Books Table');
            }
        });
        return res.redirect('/purchaseBook');
    });
    //Step3-> if not found, alert that book not in stock
});

//Add bill - Owner





// ---------------Admin_Handling---------------
app.get('/adminDashboard', checkAuthenticatedAdmin, (req, res) => {
  res.render('adminDashboard.ejs');
});


app.post('/loginAdmin', checkNotAuthenticated, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect('/login'); // If no user found, redirect to login

    // Check if the logged-in user is an admin
    if (user.email === process.env.admin_login_id) {
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.redirect('/adminDashboard'); // Redirect admin to adminDashboard
      });
    } else {
      return res.redirect('/'); // Redirect others to home
    }
  })(req, res, next);
});






app.get('/addSupplierAdmin',checkAuthenticatedAdmin,(req,res)=>{
  const query="SELECT * FROM Supplier";
  mysqlConnection.query(query,(err,table)=>{
    if(err){
      console.log("error fetching supplier table",err.message);
      return res.status(500).send("error fetching supplier details");
    }
    res.render('adminSupplier.ejs',{supplier:table});
  });

});

app.post('/addSupplierAdmin',(req,res) => {
  const {name,city,number} = req.body;
  console.log(name, city,number);
  const query = "INSERT INTO Supplier (Supplier_Name,Contact_No,City) VALUES(?,?,?)";
  mysqlConnection.query(query,[name,number,city],(err,Detail) =>{
    if(err){
      console.log("error fetching supplier table",err.message);
      return res.status(500).send("error fetching supplier details");
    }

    res.redirect('/addSupplierAdmin');
  })
})




app.get('/addSupplierBook',checkAuthenticatedAdmin,(req,res) => {
  const query = "SELECT * FROM SupplierBooks";
  const supplier = "SELECT Supplier_Name FROM Supplier";
  mysqlConnection.query(query,(err,result) => {
    if(err){
      console.log("error fetching Supplier Book Table",err.message);
      return res.status(500).send("error fetching Supplier Book Table");
    }
    mysqlConnection.query(supplier,(err,supplierN) =>{
      if(err){
        console.log("error fetching Supplier Name",err.message);
        return res.status(500).send("error fetching Supplier Name");
      }
      res.render('SupplierBook.ejs',{SupplierBook : result , SupplierName : supplierN} );
    })
  });
});

app.post('/addSupplierBook',(req,res) => {
  const {Sname,Bname,genre,price} = req.body;
  //Fetching SupplierID FROM SupplierBooks table
  let SupplierID;
  const query1 = "SELECT SupplierID FROM Supplier WHERE Supplier_Name = ?";
  mysqlConnection.query(query1,[Sname],(err,result) =>{
    if(err){
      console.log("error fetching Supplier ID",err.message);
      return res.status(500).send("error fetching Supplier ID");
    }
    console.log(result);
    SupplierID = result[0].SupplierID;
    console.log("SuppleirID -> ",SupplierID);

    const query2 = "INSERT INTO SupplierBooks (SupplierID,Supplier_Name,Book_Name,Book_Genre,Price) VALUES(?,?,?,?,?)";
    mysqlConnection.query(query2,[SupplierID,Sname,Bname,genre,price],(err) =>{
      if(err){
        console.log("error Inserting into SupplierBooks",err.message);
        return res.status(500).send("error Inserting into SupplierBooks");
      }
      console.log("Inserting into SupplierBooks Done!");
    });
  
    res.redirect('/addSupplierBook');
  });
  

  //Inserting Bok into SupplierBooks


});