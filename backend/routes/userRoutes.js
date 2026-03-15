// const express = require("express");
// const router = express.Router();
// // Adjust this path to where your DB connection is
// const db = require("../db");
// // Get all users for the "Assign Member" dropdown
// router.get("/", async (req, res) => {
//   try {
//     // Replace 'users' with your actual table name if it's different
//     const [users] = await db.execute("SELECT id, name, role FROM users");
//     res.json(users);
//   } catch (err) {
//     console.error("Error fetching users:", err);
//     res.status(500).json({ message: "Failed to fetch users" });
//   }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
// IMPORTANT: Adjust this path to match your other working routes!
const db = require("../db"); 

router.get("/", async (req, res) => {
  try {
    // 1. Try to fetch from DB
    // NOTE: If this fails, check if your table is named 'users' or 'Users'
    const [rows] = await db.query("SELECT id, name, role FROM users");
    res.json(rows);
  } catch (err) {
    console.error("CRITICAL DB ERROR:", err.message);
    
    // 2. FALLBACK: If DB fails, send an empty array so the frontend doesn't crash
    // This allows the page to load even if the user list is broken
    res.status(200).json([]); 
  }
});
module.exports = router;