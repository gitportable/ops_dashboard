require('dotenv').config();
console.log("ENV FILE TEST:", process.env.TEST_VAR);
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
const http       = require("http");
const { Server } = require("socket.io");
const path       = require("path");
const fs         = require("fs");

const app    = express();
const PORT   = process.env.PORT || 5000;
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
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "uploads")));
fs.mkdirSync(path.join(__dirname, "uploads/defects"), { recursive: true });
app.use("/api/attachments", require("./routes/attachmentRoutes"));
app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/projects",  require("./routes/projectRoutes"));
app.use("/api/issues",    require("./routes/issueRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/users",     require("./routes/userRoutes"));
app.use("/api/admin",     require("./routes/AdminRoutes"));
const workflowRoutes = require("./routes/workflowRoutes");
app.use("/api/workflows", workflowRoutes);
app.use("/api/work-orders", require("./routes/workOrderRoutes"));
app.use("/api/batches", require("./routes/batchRoutes"));
app.use("/api/vendors", require("./routes/vendorRoutes"));
app.use("/api/kpi", require("./routes/kpiRoutes"));
app.use("/api/approvals", require("./routes/approvalRoutes"));
app.use("/api/field-tickets", require("./routes/fieldRoutes"));
app.use("/api/subtasks", require("./routes/subtaskRoutes"));
app.use("/api/machines", require("./routes/machineRoutes"));
app.use("/api/inspection", require("./routes/inspectionRoutes"));
app.use('/api/inventory-alerts', require('./routes/inventoryAlertRoutes'));
app.use('/api/po-tracking', require('./routes/poTrackingRoutes'));
app.use('/api/rca', require('./routes/rcaRoutes'));

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

