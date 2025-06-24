# 📚 Book Inventory Management System

A full-stack **Book Inventory Management System** built using **Node.js** and **MySQL**.  
The project demonstrates how to build a complete database-driven application from scratch, handling different user roles such as **Admin** and **Owner**.

---

## ✨ Features

### 🔐 Admin
- Manage Suppliers
- Manage Books from Suppliers
- View Order History

### 🧾 Owner
- Generate Bills for Customers
- View Sales Reports
- View Stock and Inventory Status

---

## 🏗️ Purpose of the Project

This project was created to:
- Understand and implement **MySQL database integration** with a backend using **Node.js**.
- Gain experience in building a CRUD-based application from scratch.
- Learn about **role-based access**, **inventory workflows**, and **sales tracking**.

---

## 🛠️ Tech Stack

| Layer         | Technology      |
|---------------|-----------------|
| Backend       | Node.js, Express |
| Database      | MySQL           |
| Frontend      | Ejs , HTML, CSS, JavaScript (Basic UI) |
| Version Control | Git & GitHub |

---

## 🖼️ Screenshots


1. **Admin Dashboard**
  ![image](https://github.com/user-attachments/assets/5e1b47d2-7175-4320-9b87-902434b228da)



2. **Owner Sales Report**
   ![image](https://github.com/user-attachments/assets/f7739064-cce2-43f4-b1af-d90ea7b87a22)


3. **Generate Bill**
  ![image](https://github.com/user-attachments/assets/c16eb74a-2fba-4903-9e0f-6e876fd4bc0c)


---

## 🧪 How to Run the Project

###  Clone the Repository

```bash
git clone https://github.com/Shubhrati-09/Book_Inventory_System
cd book-inventory-system
```

###  Install Dependencies

```bash
npm install
```

### Set up the MySQL Database

  1. Open MySQL and create a database

```sql
CREATE DATABASE bookHousedb;
```

  2. Import the schema from the provided SQL file

```bash
mysql -u root -p bookHousedb < inventorydb.sql
```
  
  3. Create a .env file and update the file with your local MySQL credentials
```bash
SESSION_SECRET=secret
db_name=bookHousedb
db_user_name=root
db_password={your_mysql_password}
login_id=owner@gmail.com
login_password=123
admin_login_id=admin@gmail.com
admin_login_password=admin123
```
### Run the Server
```bash
npm start
```

#### You are all set!
