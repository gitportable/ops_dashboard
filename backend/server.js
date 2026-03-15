require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

// 1. Create Express app
const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// 2. Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 3. Standard Middleware
app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 4. Import Routes (Must happen before you app.use them!)
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const issueRoutes = require("./routes/issueRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes"); // Added this

// 5. Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes); // Added this

// 6. Socket.io logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("disconnect", () => console.log("User disconnected"));
});

// 7. Error Handling
app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});
// In your main backend server file
app.get('/api/users', async (req, res) => {
    const result = await pool.query("SELECT id, email FROM users");
    res.json({ data: result.rows });
});
// 8. Start
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");

// require("dotenv").config(); // Load .env (for JWT_SECRET, etc.)

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Mount routes
// app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/projects", require("./routes/projectRoutes"));
// app.use("/api/issues", require("./routes/issueRoutes"));
// app.use("/api/dashboard", require("./routes/dashboardRoutes"));

// // Basic 404
// app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error("Error:", err.stack);
//   res.status(500).json({ message: "Internal server error" });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));








// const express = require("express");
// const cors = require("cors");

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Mount route files (these should export a Router instance)
// app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/projects", require("./routes/projectRoutes"));
// app.use("/api/issues", require("./routes/issueRoutes"));
// app.use("/api/dashboard", require("./routes/dashboardRoutes"));

// // Optional: If you really want a separate admin router for some reason
// // (but you probably don't need it — most admin logic can live in existing routes)
// const adminRouter = express.Router();

// // Example admin-only routes (move to a separate file later if needed)
// adminRouter.get("/test", (req, res) => {
//   res.send("Admin test route");
// });

// // Mount it (optional)
// app.use("/api/admin", adminRouter);

// // Basic 404 handler
// app.use((req, res) => {
//   res.status(404).json({ message: "Route not found" });
// });

// // Global error handler (very useful)
// app.use((err, req, res, next) => {
//   console.error("Server error:", err.stack);
//   res.status(500).json({ message: "Internal server error" });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// // No need to export app in a production server file
// // (only export if you're using this in tests or another module)