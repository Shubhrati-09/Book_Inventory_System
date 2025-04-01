DROP TABLE IF EXISTS `Purchased_Stock`;
DROP TABLE IF EXISTS `Transactions`;
DROP TABLE IF EXISTS `Retail_Orders`;
DROP TABLE IF EXISTS `Books`;
DROP TABLE IF EXISTS `Supplier`;
CREATE TABLE `Supplier`(
    `SupplierID` VARCHAR(25) PRIMARY KEY,
    `Supplier_Name` VARCHAR (100) NOT NULL,
    `Contact_No.` VARCHAR(15) NOT NULL,
    `City` VARCHAR(50) NOT NULL
);

CREATE TABLE `Books` (
    `BookID` VARCHAR(25) PRIMARY KEY,
    `Book_Name` VARCHAR (100) NOT NULL,
    `Book_Genre` VARCHAR (50) NOT NULL,
    `Quantity` BIGINT NOT NULL,
    `Price` BIGINT NOT NULL,
    `SupplierID` VARCHAR (25),
    FOREIGN KEY (`SupplierID`) REFERENCES Supplier(`SupplierID`) ON DELETE CASCADE
);

CREATE TABLE Purchased_Stock (
    `OrderID` VARCHAR(25) PRIMARY KEY,
    `BookID` VARCHAR (25),
    `Book_Name` VARCHAR (100) NOT NULL,
    `Quantity` BIGINT NOT NULL,
    `TotalAmount` BIGINT,
    `SupplierID` VARCHAR (25)
);

CREATE TABLE Retail_Orders (
    `OrderID` VARCHAR(25) PRIMARY KEY DEFAULT (CONCAT('ROI', FLOOR(RAND() * 1000000000))),
    `Order_datetime` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `Customer_name` VARCHAR(255),
    `TotalAmount` BIGINT
);


CREATE TABLE Transactions (
    -- `Transaction_id` INT NOT NULL AUTO_INCREMENT,
    `OrderID` VARCHAR(25),
    `BookID` VARCHAR(25),
    `Quantity` INT NOT NULL,
    `Price` BIGINT NOT NULL,
    PRIMARY KEY (`BookID`, `OrderID`),
    FOREIGN KEY (`OrderID`) REFERENCES Retail_Orders(`OrderID`) ON DELETE CASCADE,
    FOREIGN KEY (`BookID`) REFERENCES Books(`BookID`) ON DELETE CASCADE
);



-- Create a trigger to generate SupplierID automatically if not provided
DELIMITER $$

CREATE TRIGGER before_insert_supplier
BEFORE INSERT ON Supplier
FOR EACH ROW
BEGIN
    DECLARE unique_supplier_id VARCHAR(25);

    -- Generate a random SupplierID
    SET unique_supplier_id = CONCAT('SUP', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));

    -- Check if the generated SupplierID already exists
    WHILE EXISTS (SELECT 1 FROM Supplier WHERE SupplierID = unique_supplier_id) DO
        -- Generate a new SupplierID if it already exists
        SET unique_supplier_id = CONCAT('SUP', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));
    END WHILE;

    -- Set the generated unique SupplierID
    SET NEW.SupplierID = unique_supplier_id;
END $$

DELIMITER ;

-- Trigger for generating BookID if not provided
DELIMITER $$

CREATE TRIGGER before_insert_books
BEFORE INSERT ON Books
FOR EACH ROW
BEGIN
    DECLARE unique_supplier_id VARCHAR(25);

    -- Generate a random SupplierID
    SET unique_supplier_id = CONCAT('BKI', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));

    -- Check if the generated SupplierID already exists
    WHILE EXISTS (SELECT 1 FROM Supplier WHERE SupplierID = unique_supplier_id) DO
        -- Generate a new SupplierID if it already exists
        SET unique_supplier_id = CONCAT('BKI', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));
    END WHILE;

    SET NEW.BookID = unique_supplier_id;
END $$

DELIMITER ;

-- Trigger for generating OrderID if not provided
DELIMITER $$

CREATE TRIGGER before_insert_retail_orders
BEFORE INSERT ON Retail_Orders
FOR EACH ROW
BEGIN
    DECLARE unique_supplier_id VARCHAR(25);

    -- Generate a random SupplierID
    SET unique_supplier_id = CONCAT('SUP', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));

    -- Check if the generated SupplierID already exists
    WHILE EXISTS (SELECT 1 FROM Supplier WHERE SupplierID = unique_supplier_id) DO
        -- Generate a new SupplierID if it already exists
        SET unique_supplier_id = CONCAT('ROI', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));
    END WHILE;

    SET NEW.OrderID = unique_supplier_id;
END $$

DELIMITER ;

-- Trigger for generating OrderID if not provided
DELIMITER $$

CREATE TRIGGER before_insert_Purchased_Stock
BEFORE INSERT ON Purchased_Stock
FOR EACH ROW
BEGIN
    DECLARE unique_supplier_id VARCHAR(25);

    -- Generate a random SupplierID
    SET unique_supplier_id = CONCAT('PSI', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));

    -- Check if the generated SupplierID already exists
    WHILE EXISTS (SELECT 1 FROM Supplier WHERE SupplierID = unique_supplier_id) DO
        -- Generate a new SupplierID if it already exists
        SET unique_supplier_id = CONCAT('PSI', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));
    END WHILE;

    SET NEW.OrderID = unique_supplier_id;
END $$

DELIMITER ;

INSERT INTO `Supplier` (`Supplier_Name`,`Contact_No.`,`City`) VALUES
    ('PageTurner Distributors.','5551234567','Jaipur'),
    ('Bibliophile Book Supply','9876543210','Bangalore'),
    ('BookBridge Suppliers', '9665478901','Delhi'),
    ('The Literary Link','9443290123','Kolkata'),
    ('Novel Network Suppliers','9332101234','Jammu');