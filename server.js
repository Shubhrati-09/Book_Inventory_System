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

//-------------------------Create a MySQL connection-------------------------
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
//---------------------------------------------------------------------------


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


// ----------------------------LOGIN ROUTES-----------------------------
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
//------------------------------------------------------------------------


// -------------------------Logout Route----------------------------------
app.delete('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          console.log("Logout Error:", err);
          return res.status(500).send("Error logging out");
      }
      res.redirect('/login'); // Redirect to login page after logout
  });
});
//-------------------------------------------------------------------------



//---------------------------View Books in Stock----------------------------
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
//--------------------------------------------------------------------------



//-------------------------PURCHASE BOOK PAGE FETCH-------------------------

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
//--------------------------------------------------------------------------



//-------------------------------PURCHASE BOOKS-----------------------------
app.post('/purchaseBook',checkAuthenticated, (req, res) => {
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
// ------------------------------------------------------------------------------


//-----------------------------------ADD BILLS-----------------------------------
app.get('/addBill',(req,res) =>{
  const query = "SELECT * FROM Books"
  mysqlConnection.query(query,(err,result) => {
    if(err){
      console.log("Error Fetching Books detail For Bill Creation ",err.message);
      return res.status(500).send('Error Fetching Books detail For Bill Creation');
    }
    res.render("addBill.ejs",{books : result});
  });
})
// ------------------------------------------------------------------------------


//-----------------------------------PLACE ORDER-----------------------------------
app.post("/place-order", (req, res) => {
  // const { customer_name, bookID, quantity, price } = req.body;
  const customer_name = req.body.customer_name;
  const bookID = Array.isArray(req.body["bookID[]"]) ? req.body["bookID[]"] : [req.body["bookID[]"]];
  const quantity = Array.isArray(req.body["quantity[]"]) ? req.body["quantity[]"] : [req.body["quantity[]"]];
  const price = Array.isArray(req.body["price[]"]) ? req.body["price[]"] : [req.body["price[]"]];
  
  // console.log(req.body);
  console.log(customer_name, bookID, quantity, price);

  if (!customer_name || !bookID || bookID.length === 0) {
      return res.status(400).send("Please select at least one book.");
  }

  // Generate OrderID
  const OrderID = "ORD" + Date.now();

  // Calculate total amount
  const totalAmount = price.reduce((sum, p, index) => sum + (p * quantity[index]), 0);
  const totalQuantity = quantity.reduce((total, q) => total + parseInt(q, 10), 0);
  console.log(totalQuantity);
  // Insert into Retail_Orders
  const orderQuery = "INSERT INTO Retail_Orders (OrderID,Customer_name,TotalBooks, TotalAmount) VALUES (?,?, ?,?)";
  mysqlConnection.query(orderQuery, [OrderID,customer_name,totalQuantity, totalAmount], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).send("Error placing order.");
      }

      // Insert books into Transactions
      const transactionQuery = "INSERT INTO Transactions (OrderID, BookID, Quantity, Price) VALUES ?";
      const transactionValues = bookID.map((book, index) => [
          OrderID, book, quantity[index], price[index]
      ]);

      console.log(transactionValues);
      mysqlConnection.query(transactionQuery, [transactionValues], (err, result) => {
          if (err) {
              console.error(err);
              return res.status(500).send("Error adding books to order.");
          }
          res.send("Order placed successfully!");
      });

      //Updating Quantity inside Books Table
      transactionValues.forEach(function(book) {
        const bookid = book[1];
        const q = parseInt(book[2]);
        let OriginalQ ;
        const fetchQ = "SELECT Quantity FROM Books WHERE BookID = ?";
        mysqlConnection.query(fetchQ,[bookid],(err,oq) =>{
          if(err){
            console.log("ERROr FETCHING QUANTITY USING BOOKID",err.message);
            return res.status(500).send("ERROr FETCHING QUANTITY USING BOOKID");
          }
          OriginalQ = oq[0].Quantity;
          OriginalQ = parseInt(OriginalQ) - q;
          if(OriginalQ == 0){
            //delete query
            const deleteQuery =  "DELETE FROM Books WHERE BookID=?";
            mysqlConnection.query(deleteQuery,[bookid],(err)=>{
              if(err){
                console.log("ERROR DELETING BOOK AFTER BIILING",err.message);
                return res.status(500).send("ERROR DELETING BOOK AFTER BIILING");
              }
            });
          }
          else{
            const findBook = "UPDATE Books SET Quantity = ? WHERE BookID = ?";
            mysqlConnection.query(findBook,[OriginalQ,bookid],(err)=>{
              if(err){
                console.log("ERROR UPDATING QUANTITY AFTER BIILING",err.message);
                return res.status(500).send("ERROR UPDATING QUANTITY AFTER BIILING");
              }
            });
          }
        });
    });
    
  });
});
//-----------------------------------------------------------------------------------

// app.get('/salesreport',(req,res) => {
//   const query = "SELECT * FROM Retail_Orders";
//   mysqlConnection.query(query,(err,result) => {
//     if(err){
//       console.log("ERROR FETCHING RETAIL_ORDERS FOR SALES REPORT");
//       res.status(500).send("ERROR FETCHING RETAIL_ORDERS FOR SALES REPORT");
//     }
//     const totalBooks = result.reduce((sum, row) => sum + (row.TotalBooks || 0), 0);
//     const totalAmount = result.reduce((sum, row) => sum + (row.TotalAmount || 0), 0);

//     res.render('salesreport.ejs', {
//       table: result,
//       totalBooks: totalBooks,
//       totalAmount: totalAmount
//     });
//   });
// });


app.get('/salesreport', (req, res) => {
  const query = `
    SELECT DATE(Order_datetime) AS order_date, SUM(TotalAmount) AS total_amount
    FROM Retail_Orders
    GROUP BY DATE(Order_datetime)
    ORDER BY order_date;
  `;

  mysqlConnection.query(query, (err, result) => {
    if (err) {
      console.log("ERROR FETCHING SALES DATA");
      return res.status(500).send("ERROR FETCHING SALES DATA");
    }

    const labels = result.map(row => row.order_date);
    const data = result.map(row => row.total_amount);

    // Still fetch the full table for tabular display
    const allOrdersQuery = "SELECT * FROM Retail_Orders";
    mysqlConnection.query(allOrdersQuery, (err2, allOrders) => {
      if (err2) {
        console.log("ERROR FETCHING FULL TABLE");
        return res.status(500).send("ERROR FETCHING FULL TABLE");
      }

      const totalBooks = allOrders.reduce((sum, row) => sum + (row.TotalBooks || 0), 0);
      const totalAmount = allOrders.reduce((sum, row) => sum + (row.TotalAmount || 0), 0);

      res.render('salesreport.ejs', {
        chartLabels: JSON.stringify(labels),
        chartData: JSON.stringify(data),
        table: allOrders,
        totalBooks,
        totalAmount
      });
    });
  });
});


// -------------------------Admin_Handling-------------------------
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
//-----------------------------------------------------------------


//-----------------------------------TRACK HITORY-----------------------------------
app.get('/trackhistory',(req,res) =>{
  const query = "SELECT * FROM Purchased_Stock";
  mysqlConnection.query(query,(err,result) =>{
    if(err){
      console.log("ERROR FETCHING PURCHASE_STOCKS TABLE FOR TRACK HISTORY",err.message);
      res.status(500).send("ERROR FETCHING PURCHASE_STOCKS TABLE FOR TRACK HISTORY");
    }
    res.render('trackHistory.ejs',{PStocks : result});
  });
})
//----------------------------------------------------------------------------------


//-------------------------SUPPLIER PAGE FETCH-------------------------
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
//----------------------------------------------------------------------


//------------------------------ADD SUPPLIER CODE------------------------------
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
});
//---------------------------------------------------------------------------


//-------------------------SUPPLIER BOOK PAGE FETCH-------------------------
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
//---------------------------------------------------------------------------

//----------------------------ADD SUPPLIER BOOKS----------------------------
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

      //Inserting Bok into SupplierBooks
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
});
//---------------------------------------------------------------------------
