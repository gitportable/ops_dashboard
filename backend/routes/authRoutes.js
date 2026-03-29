const router     = require("express").Router();
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const pool       = require("../db");
const auth       = require("../middleware/auth");
const rbac       = require("../middleware/rbac");
const nodemailer = require("nodemailer");

require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

function sendApprovalRequestEmail(adminEmail, userEmail, role) {
  transporter.sendMail({
    from: process.env.EMAIL_USER, to: adminEmail,
    subject: "New User Approval Request",
    text: `User (${userEmail}) requested access with role: ${role}. Approve: http://localhost:3000/users-management`,
  }).catch(err => console.error("Approval request email failed:", err));
}

function sendApprovalEmail(userEmail, status, role) {
  transporter.sendMail({
    from: process.env.EMAIL_USER, to: userEmail,
    subject: "Your Ops Dashboard Access Update",
    text: `Your account has been ${status}. Role: ${role}. Login: http://localhost:3000`,
  }).catch(err => console.error("Approval email failed:", err));
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user   = result.rows[0];

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

   
    if (user.status === "pending" || user.status === "rejected") {
      return res.status(403).json({ message: "Account not yet approved by admin" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const normalizedRole = user.role.toLowerCase();

    const token = jwt.sign(
      { id: user.id, role: normalizedRole },   // 'id' not 'userId'
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      role: normalizedRole,
      user: { id: user.id, email: user.email, name: user.name || user.email, role: normalizedRole },
      message: "Login successful",
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

router.post("/register", async (req, res) => {
  const { email, password, requestedRole } = req.body;
  if (!email || !password || !requestedRole) {
    return res.status(400).json({ message: "All fields required" });
  }
  if (requestedRole.toLowerCase() === "superadmin") {
    return res.status(403).json({ message: "SuperAdmin cannot be self-registered" });
  }
  try {
    const hashed       = await bcrypt.hash(password, 10);
    const autoApproved = ["admin"].includes(requestedRole.toLowerCase());
    const status       = autoApproved ? "approved" : "pending";

    const result = await pool.query(
      `INSERT INTO users (email, password, role, status)
       VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING *`,
      [email, hashed, requestedRole, status]
    );

    if (result.rowCount === 0) return res.status(409).json({ message: "Email already registered" });

    if (status === "pending") sendApprovalRequestEmail("admin@example.com", email, requestedRole);

    res.status(201).json({
      message: autoApproved
        ? "Registration successful! You can log in now."
        : "Registration submitted. Awaiting admin approval.",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Error registering user" });
  }
});

router.get("/users/pending", auth, rbac("superadmin", "admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, role, status FROM users WHERE status = 'pending'"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch pending users" });
  }
});
router.put("/users/:id/approve", auth, rbac("superadmin", "admin"), async (req, res) => {
  const { id } = req.params;
  const { approve, role } = req.body;
  try {
    if (approve) {
      await pool.query("UPDATE users SET status=$1, role=$2 WHERE id=$3", ["approved", role || "tester", id]);
      const u = await pool.query("SELECT email FROM users WHERE id=$1", [id]);
      sendApprovalEmail(u.rows[0].email, "approved", role || "tester");
      res.json({ message: "User approved" });
    } else {
      await pool.query("DELETE FROM users WHERE id=$1", [id]);
      res.json({ message: "User rejected and deleted" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error processing approval" });
  }
});

module.exports = router;
