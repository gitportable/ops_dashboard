const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authenticateToken = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const pool = require("../db");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/defects/"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error("Images only"), false);
  },
});

router.use(authenticateToken);

router.post(
  "/issue/:issueId",
  rbac("tester", "developer", "admin", "superadmin"),
  upload.single("image"),
  async (req, res) => {
    const { issueId } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }
    try {
      const result = await pool.query(
        `INSERT INTO issue_attachments (issue_id, file_name, file_path, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          issueId,
          req.file.originalname,
          `/uploads/defects/${req.file.filename}`,
          req.file.size,
          req.user.id,
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("createAttachment error:", err.message);
      return res.status(500).json({ message: "Failed to upload attachment" });
    }
  }
);

router.get("/issue/:issueId", async (req, res) => {
  const { issueId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM issue_attachments WHERE issue_id = $1 ORDER BY id DESC`,
      [issueId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("getAttachments error:", err.message);
    return res.status(500).json({ message: "Failed to fetch attachments" });
  }
});

router.delete(
  "/:id",
  rbac("tester", "developer", "admin", "superadmin"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const existing = await pool.query(
        "SELECT * FROM issue_attachments WHERE id = $1",
        [id]
      );
      if (existing.rowCount === 0) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      const uploadedBy = existing.rows[0].uploaded_by;
      const requesterId = req.user.id;
      const isAdminOrAbove = ["admin", "superadmin", "tester"].includes(req.user.role);

      const canDelete = !uploadedBy || String(uploadedBy) === String(requesterId) || isAdminOrAbove;

      if (!canDelete) {
        return res.status(403).json({ message: "You can only delete your own attachments" });
      }

      const filePath = existing.rows[0].file_path || "";
      const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
      const fullPath = path.join(__dirname, "..", relativePath);

      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error("deleteAttachment file error:", err.message);
        // Continue to delete from DB even if file is missing/failed
      }

      await pool.query("DELETE FROM issue_attachments WHERE id = $1", [id]);
      return res.json({ message: "Attachment deleted" });
    } catch (err) {
      console.error("deleteAttachment error:", err.message);
      return res.status(500).json({ message: "Failed to delete attachment" });
    }
  }
);

module.exports = router;
