const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const nodemailer = require("nodemailer");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

require("dotenv").config();

// Email transporter for approval notifications
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send approval request email to admin
function sendApprovalRequestEmail(adminEmail, userEmail, role) {
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: "New User Approval Request",
    text: `A new user (${userEmail}) requested access with role: ${role}.\nApprove here: http://localhost:3000/users-management`,
  }).catch(err => console.error("Failed to send approval request email:", err));
}

// Send approval/rejection email to user
function sendApprovalEmail(userEmail, status, role) {
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "Your Ops Dashboard Access Update",
    text: `Your account has been ${status}.\nRole: ${role}\nLogin now: http://localhost:3000`,
  }).catch(err => console.error("Failed to send approval email:", err));
}

// Passport Google OAuth setup
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [profile.emails[0].value]
        );
        user = user.rows[0];

        if (!user) {
          // Auto-create user with Tester role (approved by default)
          const result = await pool.query(
            "INSERT INTO users (email, password, role, status) VALUES ($1, $2, $3, $4) RETURNING *",
            [profile.emails[0].value, "google-oauth", "Tester", "approved"]
          );
          user = result.rows[0];
        } else if (user.status !== "approved") {
          return done(null, false, { message: "Account not approved" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

// Google login route (redirects to Google)
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google callback (after Google login)
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    const user = req.user;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Redirect to frontend with token
    res.redirect(
      `http://localhost:3000/dashboard?token=${token}&role=${user.role}`
    );
  }
);

// Traditional Login (email/password)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status !== "approved") {
      return res.status(403).json({
        message: "Account not yet approved by admin"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      role: user.role,
      message: "Login successful"
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// User Registration
router.post("/register", async (req, res) => {
  const { email, password, requestedRole } = req.body;

  if (!email || !password || !requestedRole) {
    return res.status(400).json({ message: "All fields required" });
  }

  // Prevent self-registration as SuperAdmin
  if (requestedRole.toLowerCase() === "superadmin") {
    return res.status(403).json({
      message: "SuperAdmin role cannot be requested directly"
    });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    // Auto-approve Admin role, others require approval
    const autoApprovedRoles = ["admin"];
    const initialStatus = autoApprovedRoles.includes(requestedRole.toLowerCase())
      ? "approved"
      : "pending";

    const result = await pool.query(
      "INSERT INTO users (email, password, role, status) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING *",
      [email, hashed, requestedRole, initialStatus]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Send approval request email for pending users
    if (initialStatus === "pending") {
      sendApprovalRequestEmail("admin@example.com", email, requestedRole);
    }

    res.status(201).json({
      message: initialStatus === "approved"
        ? "Registration successful! You can log in now."
        : "Registration submitted. Awaiting admin approval."
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Error registering user" });
  }
});

// Get pending users (admin only)
router.get(
  "/users/pending",
  auth,
  rbac("superadmin", "admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, email, role, status FROM users WHERE status = 'pending'"
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  }
);

// Approve/reject user (admin only)
router.put(
  "/users/:id/approve",
  auth,
  rbac("superadmin", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const { approve, role } = req.body;

    try {
      if (approve) {
        await pool.query(
          "UPDATE users SET status = $1, role = $2 WHERE id = $3",
          ["approved", role || "Tester", id]
        );
        const userResult = await pool.query(
          "SELECT email FROM users WHERE id = $1",
          [id]
        );
        sendApprovalEmail(userResult.rows[0].email, "approved", role || "Tester");
        res.json({ message: "User approved" });
      } else {
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.json({ message: "User rejected and deleted" });
      }
    } catch (err) {
      console.error("Approval error:", err);
      res.status(500).json({ message: "Error processing approval" });
    }
  }
);

module.exports = router;


// const router = require("express").Router();
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const pool = require("../db");
// const auth = require("../middleware/auth");
// const rbac = require("../middleware/rbac");
// const nodemailer = require("nodemailer");
// const passport = require("passport");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;

// require("dotenv").config();

// // Email transporter (optional – for approval emails)
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Send approval request email to admin
// function sendApprovalRequestEmail(adminEmail, userEmail, role) {
//   transporter.sendMail({
//     from: "opsdashboard@gmail.com",
//     to: adminEmail,
//     subject: "New User Approval Request",
//     text: `A new user (${userEmail}) requested access with role: ${role}.\nApprove here: http://localhost:3000/users-management`,
//   }).catch(err => console.error("Failed to send approval request email:", err));
// }

// // Send approval/rejection email to user
// function sendApprovalEmail(userEmail, status, role) {
//   transporter.sendMail({
//     from: "opsdashboard@gmail.com",
//     to: userEmail,
//     subject: "Your Ops Dashboard Access Update",
//     text: `Your account has been ${status}.\nRole: ${role}\nLogin now: http://localhost:3000`,
//   }).catch(err => console.error("Failed to send approval email:", err));
// }

// // Passport Google OAuth setup
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: "http://localhost:5000/api/auth/google/callback",
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         let user = await pool.query("SELECT * FROM users WHERE email = $1", [profile.emails[0].value]);
//         user = user.rows[0];

//         if (!user) {
//           // Auto-create user (auto-approved for simplicity – change if needed)
//           const result = await pool.query(
//             "INSERT INTO users (email, password, role, status) VALUES ($1, $2, $3, $4) RETURNING *",
//             [profile.emails[0].value, "google-oauth", "Tester", "approved"]
//           );
//           user = result.rows[0];
//         } else if (user.status !== "approved") {
//           return done(null, false, { message: "Account not approved" });
//         }

//         return done(null, user);
//       } catch (err) {
//         return done(err);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//   try {
//     const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
//     done(null, result.rows[0]);
//   } catch (err) {
//     done(err);
//   }
// });

// // Google login route (redirects to Google)
// router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// // Google callback (after Google login)
// router.get(
//   "/google/callback",
//   passport.authenticate("google", { failureRedirect: "/" }),
//   async (req, res) => {
//     const user = req.user;

//     // Generate JWT (same as normal login)
//     const token = jwt.sign(
//       { userId: user.id, role: user.role.toLowerCase() },
//       process.env.JWT_SECRET,
//       { expiresIn: "24h" }
//     );

//     // Redirect to frontend dashboard with token
//     res.redirect(`http://localhost:3000/dashboard?token=${token}&role=${user.role}`);
//   }
// );

// // Login - Traditional (email/password) – PUBLIC
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password required" });
//   }

//   try {
//     const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
//     const user = result.rows[0];

//     if (!user) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     if (user.status !== "approved") {
//       return res.status(403).json({ message: "Account not yet approved by admin" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { userId: user.id, role: user.role.toLowerCase() },
//       process.env.JWT_SECRET,
//       { expiresIn: "24h" }
//     );

//     res.json({
//       token,
//       role: user.role,
//       message: "Login successful"
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ message: "Server error during login" });
//   }
// });

// // Register - PUBLIC
// router.post("/register", async (req, res) => {
//   const { email, password, requestedRole } = req.body;

//   if (!email || !password || !requestedRole) {
//     return res.status(400).json({ message: "All fields required" });
//   }

//   // Prevent self-registration as SuperAdmin
//   if (requestedRole.toLowerCase() === "superadmin") {
//     return res.status(403).json({ message: "SuperAdmin role cannot be requested directly" });
//   }

//   try {
//     const hashed = await bcrypt.hash(password, 10);

//     // Auto-approve Admin, pending for others
//     const autoApprovedRoles = ["admin"];
//     const initialStatus = autoApprovedRoles.includes(requestedRole.toLowerCase()) ? "approved" : "pending";

//     const result = await pool.query(
//       "INSERT INTO users (email, password, role, status) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING *",
//       [email, hashed, requestedRole, initialStatus]
//     );

//     if (result.rowCount === 0) {
//       return res.status(409).json({ message: "Email already registered" });
//     }

//     // Send approval email only for pending users
//     if (initialStatus === "pending") {
//       sendApprovalRequestEmail("admin@example.com", email, requestedRole);
//     }

//     res.status(201).json({
//       message: initialStatus === "approved"
//         ? "Registration successful! You can log in now."
//         : "Registration submitted. Awaiting admin approval."
//     });
//   } catch (err) {
//     console.error("Register error:", err);
//     res.status(500).json({ message: "Error registering user" });
//   }
// });

// // Get pending users (protected)
// router.get("/users/pending", auth, rbac("superadmin", "admin"), async (req, res) => {
//   try {
//     const result = await pool.query("SELECT id, email, role, status FROM users WHERE status = 'pending'");
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to fetch pending users" });
//   }
// });

// // Approve/reject user (protected)
// router.put("/users/:id/approve", auth, rbac("superadmin", "admin"), async (req, res) => {
//   const { id } = req.params;
//   const { approve, role } = req.body;

//   try {
//     if (approve) {
//       await pool.query("UPDATE users SET status = $1, role = $2 WHERE id = $3", ["approved", role || "Tester", id]);
//       const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [id]);
//       sendApprovalEmail(userResult.rows[0].email, "approved", role || "Tester");
//       res.json({ message: "User approved" });
//     } else {
//       await pool.query("DELETE FROM users WHERE id = $1", [id]);
//       res.json({ message: "User rejected and deleted" });
//     }
//   } catch (err) {
//     console.error("Approval error:", err);
//     res.status(500).json({ message: "Error processing approval" });
//   }
// });

// module.exports = router;











// const router = require("express").Router();
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const pool = require("../db");
// const auth = require("../middleware/auth");
// const rbac = require("../middleware/rbac");
// const nodemailer = require("nodemailer");

// require("dotenv").config(); // Load .env for JWT_SECRET, email creds

// // Email transporter (use your real Gmail app password!)
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER || "yourgmail@gmail.com",
//     pass: process.env.EMAIL_PASS || "your-16-char-app-password",
//   },
// });

// // Send email to admin for approval request
// function sendApprovalRequestEmail(adminEmail, userEmail, role) {
//   transporter.sendMail({
//     from: "opsdashboard@gmail.com",
//     to: adminEmail,
//     subject: "New User Approval Request",
//     text: `A new user (${userEmail}) requested access with role: ${role}.\nApprove here: http://localhost:3000/users-management`,
//   }).catch(err => console.error("Failed to send approval request email:", err));
// }

// // Send approval/rejection email to user
// function sendApprovalEmail(userEmail, status, role) {
//   transporter.sendMail({
//     from: "opsdashboard@gmail.com",
//     to: userEmail,
//     subject: "Your Ops Dashboard Access Update",
//     text: `Your account has been ${status}.\nRole: ${role}\nLogin now: http://localhost:3000`,
//   }).catch(err => console.error("Failed to send approval email:", err));
// }

// // Login - PUBLIC (no auth middleware!)
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password required" });
//   }

//   try {
//     const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
//     const user = result.rows[0];

//     if (!user) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     if (user.status !== "approved") {
//       return res.status(403).json({ message: "Account not yet approved by admin" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { userId: user.id, role: user.role.toLowerCase() },
//       process.env.JWT_SECRET || "dev-secret-change-in-production",
//       { expiresIn: "24h" }
//     );

//     res.json({
//       token,
//       role: user.role, // keep original casing
//       message: "Login successful"
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ message: "Server error during login" });
//   }
// });
// router.post("/register", async (req, res) => {
//   const { email, password, requestedRole } = req.body;

//   if (!email || !password || !requestedRole) {
//     return res.status(400).json({ message: "All fields required" });
//   }

//   // Security: Prevent self-registration as SuperAdmin
//   if (requestedRole.toLowerCase() === "superadmin") {
//     return res.status(403).json({ message: "SuperAdmin role cannot be requested directly" });
//   }

//   try {
//     const hashed = await bcrypt.hash(password, 10);

//     // Auto-approve Admin, pending for Developer/Tester/other roles
//     const autoApprovedRoles = ["admin", "superadmin"]; // ← SuperAdmin also auto-approved (if somehow requested)
//     const initialStatus = autoApprovedRoles.includes(requestedRole.toLowerCase()) ? "approved" : "pending";

//     const result = await pool.query(
//       "INSERT INTO users (email, password, role, status) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING *",
//       [email, hashed, requestedRole, initialStatus]
//     );

//     if (result.rowCount === 0) {
//       return res.status(409).json({ message: "Email already registered" });
//     }

//     // Only send approval email for pending users
//     if (initialStatus === "pending") {
//       sendApprovalRequestEmail("admin@example.com", email, requestedRole);
//     }

//     res.status(201).json({
//       message: initialStatus === "approved"
//         ? "Registration successful! You can log in now."
//         : "Registration submitted. Awaiting admin approval."
//     });
//   } catch (err) {
//     console.error("Register error:", err);
//     res.status(500).json({ message: "Error registering user" });
//   }
// });
// // Register - PUBLIC
// // router.post("/register", async (req, res) => {
// //   const { email, password, requestedRole } = req.body;

// //   if (!email || !password || !requestedRole) {
// //     return res.status(400).json({ message: "All fields required" });
// //   }

// //   try {
// //     const hashed = await bcrypt.hash(password, 10);

// //     const result = await pool.query(
// //       "INSERT INTO users (email, password, role, status) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING *",
// //       [email, hashed, requestedRole, "pending"]
// //     );

// //     if (result.rowCount === 0) {
// //       return res.status(409).json({ message: "Email already registered" });
// //     }

// //     // Send approval request email to admin
// //     sendApprovalRequestEmail("admin@example.com", email, requestedRole);

// //     res.status(201).json({ message: "Registration submitted. Awaiting admin approval." });
// //   } catch (err) {
// //     console.error("Register error:", err);
// //     res.status(500).json({ message: "Error registering user" });
// //   }
// // });

// // // Get pending users (for admin dashboard)
// // router.get("/users/pending", auth, rbac("superadmin", "admin"), async (req, res) => {
// //   try {
// //     const result = await pool.query("SELECT id, email, role, status FROM users WHERE status = 'pending'");
// //     res.json(result.rows);
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ message: "Failed to fetch pending users" });
// //   }
// // });

// // Approve/reject user (for admin)
// router.put("/users/:id/approve", auth, rbac("superadmin", "admin"), async (req, res) => {
//   const { id } = req.params;
//   const { approve, role } = req.body;

//   try {
//     if (approve) {
//       await pool.query("UPDATE users SET status = $1, role = $2 WHERE id = $3", ["approved", role || "Tester", id]);
//       const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [id]);
//       sendApprovalEmail(userResult.rows[0].email, "approved", role || "Tester");
//       res.json({ message: "User approved" });
//     } else {
//       await pool.query("DELETE FROM users WHERE id = $1", [id]);
//       res.json({ message: "User rejected and deleted" });
//     }
//   } catch (err) {
//     console.error("Approval error:", err);
//     res.status(500).json({ message: "Error processing approval" });
//   }
// });

// module.exports = router;// only once at the end





























































































// const router = require("express").Router();
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const pool = require("../db");
// const auth = require("../middleware/auth");
// const rbac = require("../middleware/rbac");
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password required" });
//   }

//   try {
//     const result = await pool.query(
//       "SELECT * FROM users WHERE email = $1",
//       [email]
//     );
//     const user = result.rows[0];

//     if (!user) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { userId: user.id, role: user.role.toLowerCase() }, // normalize to lowercase
//       process.env.JWT_SECRET || "your-secret-key-for-dev-only", // ← use .env in production!
//       { expiresIn: "24h" }
//     );

//     res.json({
//       token,
//       role: user.role, // keep original casing if frontend expects "SuperAdmin"
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// module.exports = router;
// // ... existing login

// // Registration: creates user with 'pending' status
// router.post("/register", async (req, res) => {
//   const { email, password, requestedRole } = req.body;
//   const hashed = await bcrypt.hash(password, 10);

//   try {
//     await pool.query(
//       "INSERT INTO users (email, password, role, status) VALUES ($1, $2, $3, $4)",
//       [email, hashed, requestedRole, 'pending']
//     );
//     // Send email to admin for approval (see below)
//     sendApprovalRequestEmail('admin@example.com', email, requestedRole);
//     res.json({ message: "Registration submitted for approval" });
//   } catch (err) {
//     res.status(500).json({ message: "Error registering" });
//   }
// });

// // Approval: SuperAdmin/Admin approves/rejects
// router.put("/users/:id/approve", auth, rbac("superadmin", "admin"), async (req, res) => {
//   const { id } = req.params;
//   const { approve, role } = req.body;  // approve: true/false, role: if changing

//   try {
//     if (approve) {
//       await pool.query("UPDATE users SET status = $1, role = $2 WHERE id = $3", ['approved', role, id]);
//       // Send email to user
//       const user = await pool.query("SELECT email FROM users WHERE id = $1", [id]);
//       sendApprovalEmail(user.rows[0].email, 'approved', role);
//     } else {
//       await pool.query("DELETE FROM users WHERE id = $1", [id]);
//       // Send rejection email (similar)
//     }
//     res.json({ message: "User approved/rejected" });
//   } catch (err) {
//     res.status(500).json({ message: "Error approving" });
//   }
// });

// // // Email function (add to a new services/email.js)
// // const nodemailer = require('nodemailer');

// // const transporter = nodemailer.createTransport({
// //   service: 'gmail',
// //   auth: {
// //     user: 'yourgmail@gmail.com',
// //     pass: 'your-app-password'  // Use app password, not regular
// //   }
// // });

// function sendApprovalRequestEmail(adminEmail, userEmail, role) {
//   transporter.sendMail({
//     from: 'opsdashboard@gmail.com',
//     to: adminEmail,
//     subject: 'New User Approval Request',
//     text: `Approve ${userEmail} for role ${role}?`
//   });
// }

// function sendApprovalEmail(userEmail, status, role) {
//   transporter.sendMail({
//     from: 'opsdashboard@gmail.com',
//     to: userEmail,
//     subject: 'Your Ops Dashboard Access',
//     text: `Your access is ${status}. Role: ${role}. Login now!`
//   });
// }
// module.exports = router;
// // module.exports = { sendApprovalRequestEmail, sendApprovalEmail };