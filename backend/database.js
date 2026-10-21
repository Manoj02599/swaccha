const Database = require("better-sqlite3");

const db = new Database("swaccha.db");


// =========================
// REPORTS TABLE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        category TEXT,
        address TEXT,
        description TEXT,
        photo TEXT,
        latitude TEXT,
        longitude TEXT,
        department TEXT,
        priority TEXT,
        date TEXT,
        createdAt TEXT,
        status TEXT,
        userEmail TEXT
    )
`).run();

console.log("SWACCHA database is ready.");


// =========================
// USERS TABLE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        mobile TEXT,
        email TEXT UNIQUE NOT NULL,
        city TEXT,
        area TEXT,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'citizen'
    )
`).run();

console.log("Users table is ready.");


// =========================
// ADD userEmail TO OLD DATABASE
// =========================

const reportColumns =
    db.prepare("PRAGMA table_info(reports)").all();

const userEmailColumn =
    reportColumns.find(function (column) {

        return column.name === "userEmail";

    });


if (!userEmailColumn) {

    db.prepare(`
        ALTER TABLE reports
        ADD COLUMN userEmail TEXT
    `).run();

    console.log("userEmail column added.");

} else {

    console.log("userEmail column already exists.");

}

// =========================
// NOTIFICATIONS TABLE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userEmail TEXT,
        reportId TEXT,
        message TEXT,
        isRead INTEGER DEFAULT 0,
        createdAt TEXT
    )
`).run();

console.log("Notifications table is ready.");


module.exports = db;