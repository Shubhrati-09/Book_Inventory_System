// --------------------------- CODE FOR PURCHASING BOOK ---------------------------
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

//------------------------------------------------------------------------------------------------------------

/* <form action="/borrow" method="POST">
<label for="bookName">Book Name:</label>
<select id="bookName" name="bookName" onchange="updateQuantityDropdown()">
    <option value="">Select a book</option>
    <% books.forEach(book => { %>
        <option value="<%= book.BookID %>" data-quantity="<%= book.Quantity %> data-price="<%= book.Price %>">
            <%= book.Book_Name %>
        </option>
    <% }) %>
</select>

<label for="quantity">Quantity:</label>
<select id="quantity" name="quantity">
    <option value="">Select quantity</option>
</select>

<button type="submit">Borrow</button>
</form>

<script>
function updateQuantityDropdown() {
    const bookDropdown = document.getElementById("bookName");
    const quantityDropdown = document.getElementById("quantity");

    // Get selected book's available quantity
    const selectedOption = bookDropdown.options[bookDropdown.selectedIndex];
    const maxQuantity = selectedOption.getAttribute("data-quantity");

    // Clear existing options
    quantityDropdown.innerHTML = '<option value="">Select quantity</option>';

    // Populate quantity dropdown from 1 to maxQuantity
    for (let i = 1; i <= maxQuantity; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        quantityDropdown.appendChild(option);
    }
}
</script> */
// }


// export function initialize(passport, getUserByEmail, getUserById) {
//     const authenticateUser = async (email, password, done) => {
//       const user = getUserByEmail(email);
//       if (!user) {
//         return done(null, false, { message: 'No user with that email' });
//       }
  
//       try {
//         if (password === user.password) {
//           return done(null, user);
//         } else {
//           console.log(`Username = ${user.email}`);
//           console.log(`Entered Password = ${password}`);
//           console.log(`Stored Password = ${user.password}`);
          
//           return done(null, false, { message: 'Password incorrect' });
//         }
//       } catch (error) {
//         return done(error);
//       }
//     };
  
//     passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
//     passport.serializeUser((user, done) => done(null, user.id));
//     passport.deserializeUser((id, done) => {
//       return done(null, getUserById(id));
//     });

//   }