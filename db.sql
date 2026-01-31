-- 1. Create and use the database
CREATE DATABASE IF NOT EXISTS tradex_db;
USE tradex_db;

-- 2. Delete existing tables to prevent conflicts
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS teams;

-- 3. Create settings table
CREATE TABLE settings (
    id INT PRIMARY KEY,
    active_view VARCHAR(50) DEFAULT 'market_line',
    overlay_active TINYINT(1) DEFAULT 1
);

INSERT INTO settings VALUES (1, 'market_line', 1);

-- 4. Create companies table
CREATE TABLE companies (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    price INT DEFAULT 100,
    color VARCHAR(20),
    history TEXT 
);

INSERT INTO companies VALUES 
(0,'Company 1',100,'#ef4444','100'),
(1,'Company 2',100,'#f59e0b','100'),
(2,'Company 3',100,'#10b981','100'),
(3,'Company 4',100,'#06b6d4','100'),
(4,'Company 5',100,'#3b82f6','100'),
(5,'Company 6',100,'#6366f1','100'),
(6,'Company 7',100,'#d946ef','100');

-- 5. Create teams table
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    purse DOUBLE DEFAULT 10000,
    wealth DOUBLE DEFAULT 10000,
    stocks TEXT, 
    last_bid DOUBLE DEFAULT 0,
    wealth_history TEXT 
);
