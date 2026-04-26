const pool = require("../db");

// Simple query wrapper for consistency
const sq = async (q, params = [], name = "query") => {
  try {
    const res = await pool.query(q, params);
    return res.rows;
  } catch (err) {
    console.error(`DB Error (${name}):`, err.message);
    throw err;
  }
};

exports.createDefect = async (req, res) => {
  try {
    const { defect_type, machine_id, batch_lot, projectid, description } = req.body;
    const result = await pool.query(`
      INSERT INTO expanded_factissues (defect_type, machine_id, batch_lot, projectid, description, status, createddate, issuetype)
      VALUES ($1, $2, $3, $4, $5, 'Open', NOW(), 'Bug')
      RETURNING *
    `, [defect_type, machine_id, batch_lot, projectid, description]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to create defect" });
  }
};

exports.getDefects = async (req, res) => {
  try {
    const rows = await sq(`
      SELECT * FROM expanded_factissues 
      WHERE defect_type IS NOT NULL 
      ORDER BY createddate DESC
    `, [], "getDefects");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch defects" });
  }
};

exports.updateRCA = async (req, res) => {
  try {
    const { id } = req.params;
    const { rca, capa, classification } = req.body;
    await sq(`
      UPDATE expanded_factissues 
      SET rca = $1, capa = $2, classification = $3 
      WHERE issueid = $4
    `, [rca, capa, classification, id], "updateRCA");
    res.json({ message: "RCA/CAPA updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update RCA" });
  }
};

exports.uploadDefectImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body; // In a real app, this would be a file upload to S3/Cloudinary
    await sq(`
      UPDATE expanded_factissues 
      SET image_url = $1 
      WHERE issueid = $2
    `, [imageUrl, id], "uploadImage");
    res.json({ message: "Image uploaded successfully", imageUrl });
  } catch (err) {
    res.status(500).json({ message: "Failed to upload image" });
  }
};

exports.getDefectStats = async (req, res) => {
  try {
    const rows = await sq(`
      SELECT defect_type as name, COUNT(*)::INT as value 
      FROM expanded_factissues 
      WHERE defect_type IS NOT NULL 
      GROUP BY defect_type
    `, [], "getDefectStats");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch defect stats" });
  }
};
