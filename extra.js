// --------------------------- CODE FOR PURCHASING BOOK ---------------------------
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

//------------------------------------------------------------------------------------------------------------