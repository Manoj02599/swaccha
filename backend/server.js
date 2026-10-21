const express = require("express");
const cors = require("cors");
const db = require("./database");
const bcrypt = require("bcryptjs");

const app = express();

const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// =========================
// HOME
// =========================

app.get("/", function (req, res) {
    res.send("SWACCHA Backend is running!");
});


// =========================
// SAVE REPORT
// =========================

app.post("/api/reports", function (req, res) {

    const report = req.body;

    try {

        const insertReport = db.prepare(`
            INSERT INTO reports (
                id,
                category,
                address,
                description,
                photo,
                latitude,
                longitude,
                department,
                priority,
                date,
                createdAt,
                status,
                userEmail
            )
            VALUES (
                @id,
                @category,
                @address,
                @description,
                @photo,
                @latitude,
                @longitude,
                @department,
                @priority,
                @date,
                @createdAt,
                @status,
                @userEmail
            )
        `);


        insertReport.run(report);

        res.status(201).json({
            message: "Report saved to database successfully",
            report: report
        });

    } catch (error) {

        console.error("Database error:", error);

        res.status(500).json({
            message: "Failed to save report"
        });

    }

});


// =========================
// GET ALL REPORTS
// =========================

app.get("/api/reports", function (req, res) {

    try {

        const reports = db
            .prepare(
                "SELECT * FROM reports ORDER BY rowid DESC"
            )
            .all();

        res.json(reports);

    } catch (error) {

        console.error("Database error:", error);

        res.status(500).json({
            message: "Failed to get reports"
        });

    }

});


// =========================
// UPDATE REPORT STATUS
// =========================

app.put("/api/reports/:id/status", function (req, res) {

    const reportId = req.params.id;
    const newStatus = req.body.status;
    const userEmail = req.body.userEmail;

    try {

        // Check the logged-in user's role
        const user = db.prepare(`
            SELECT role
            FROM users
            WHERE email = ?
        `).get(userEmail);

        if (!user) {

            return res.status(401).json({
                message: "User not found"
            });

        }

        // Only officers can update report status
        if (user.role !== "officer") {

            return res.status(403).json({
                message: "Only officers can update report status"
            });

        }

        const updateReport = db.prepare(`
            UPDATE reports
            SET status = ?
            WHERE id = ?
        `);

        const result = updateReport.run(
            newStatus,
            reportId
        );

        // Create notification for the citizen

const report = db.prepare(`
    SELECT userEmail
    FROM reports
    WHERE id = ?
`).get(reportId);

if (report && report.userEmail) {

    db.prepare(`
        INSERT INTO notifications
        (
            userEmail,
            reportId,
            message,
            createdAt
        )
        VALUES (?, ?, ?, ?)
    `).run(
        report.userEmail,
        reportId,
        "Your complaint " +
        reportId +
        " status changed to " +
        newStatus,
        new Date().toISOString()
    );
}

        if (result.changes === 0) {

            return res.status(404).json({
                message: "Report not found"
            });

        }

        res.json({
            message: "Report status updated successfully",
            id: reportId,
            status: newStatus
        });

    } catch (error) {

        console.error(
            "Status update error:",
            error
        );

        res.status(500).json({
            message: "Failed to update report status"
        });

    }

});


// =========================
// UPDATE REPORT DEPARTMENT
// =========================

app.put("/api/reports/:id/department", function (req, res) {

    const reportId = req.params.id;
    const newDepartment = req.body.department;

    try {

        const updateReport = db.prepare(`
            UPDATE reports
            SET department = ?
            WHERE id = ?
        `);

        const result = updateReport.run(
            newDepartment,
            reportId
        );

        if (result.changes === 0) {

            return res.status(404).json({
                message: "Report not found"
            });

        }

        res.json({
            message: "Report department updated successfully",
            id: reportId,
            department: newDepartment
        });

    } catch (error) {

        console.error(
            "Department update error:",
            error
        );

        res.status(500).json({
            message: "Failed to update department"
        });

    }

});


// =========================
// USER SIGNUP
// =========================

app.post("/api/signup", function (req, res) {

    const {
        fullName,
        mobile,
        email,
        city,
        area,
        password: plainPassword
    } = req.body;


    // CHECK REQUIRED FIELDS

    if (!fullName || !email || !plainPassword) {

        return res.status(400).json({
            success: false,
            message: "Please fill all required fields."
        });

    }


    try {

        // CHECK IF EMAIL ALREADY EXISTS

        const existingUser = db.prepare(`
            SELECT id
            FROM users
            WHERE email = ?
        `).get(email);


        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });

        }


        // HASH PASSWORD

        const hashedPassword =
            bcrypt.hashSync(plainPassword, 10);


        // INSERT USER

        const insertUser = db.prepare(`
            INSERT INTO users (
                fullName,
                mobile,
                email,
                city,
                area,
                password
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `);


        insertUser.run(
            fullName,
            mobile,
            email,
            city,
            area,
            hashedPassword
        );


        // SUCCESS RESPONSE

        res.status(201).json({

            success: true,

            message: "Account created successfully!"

        });


    } catch (error) {

        console.error(
            "Signup error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to create account."

        });

    }

});

// =========================
// USER LOGIN
// =========================

app.post("/api/login", function (req, res) {

    const {
        email,
        password
    } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            success: false,
            message: "Please enter email and password."
        });

    }

    try {

        const user = db.prepare(`
            SELECT *
            FROM users
            WHERE email = ?
        `).get(email);

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }

        const passwordMatch =
            bcrypt.compareSync(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }

        res.json({

            success: true,

            message: "Login successful!",

            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                mobile: user.mobile,
                city: user.city,
                area: user.area,
                role: user.role
            }

        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Login failed."
        });

    }

});

// =========================
// CREATE DEFAULT OFFICER
// =========================

const officerExists = db.prepare(`
    SELECT * FROM users
    WHERE email = ?
`).get("officer@swaccha.com");

if (!officerExists) {

    const officerPassword =
        bcrypt.hashSync("Officer@123", 10);

    db.prepare(`
        INSERT INTO users (
            fullName,
            mobile,
            email,
            city,
            area,
            password,
            role
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        "SWACCHA Officer",
        "",
        "officer@swaccha.com",
        "Bengaluru",
        "",
        officerPassword,
        "officer"
    );

    console.log("Default officer account created.");

}

// =========================
// NOTIFICATIONS
// =========================

app.get("/api/notifications/:email", function (req, res) {

    try {

        const notifications = db.prepare(`
            SELECT *
            FROM notifications
            WHERE userEmail = ?
            ORDER BY id DESC
        `).all(req.params.email);

        res.json(notifications);

    } catch (error) {

        console.error("Notification error:", error);

        res.status(500).json({
            message: "Failed to load notifications"
        });

    }

});


app.get("/api/test-notification", function (req, res) {

    db.prepare(`
        INSERT INTO notifications
        (userEmail, reportId, message, createdAt)
        VALUES (?, ?, ?, ?)
    `).run(
        "manojhp8431@gmail.com",
        "TEST-001",
        "Test notification from SWACCHA",
        new Date().toISOString()
    );

    res.json({
        message: "Test notification created"
    });
});

// =========================
// START SERVER
// =========================

app.listen(PORT, function () {

    console.log(
        `SWACCHA server running at http://localhost:${PORT}`
    );

});