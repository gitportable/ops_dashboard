require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
const http       = require("http");
const { Server } = require("socket.io");

const app    = express();
const PORT   = process.env.PORT || 5001;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: ["http://localhost:3000", "http://localhost:3001"], methods: ["GET", "POST"], credentials: true }
});
app.set("io", io);

app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/projects",  require("./routes/projectRoutes"));
app.use("/api/issues",    require("./routes/issueRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/users",     require("./routes/userRoutes"));
app.use("/api/admin",     require("./routes/AdminRoutes"));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
