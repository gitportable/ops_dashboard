// controllers/productionController.js
const pool = require("../db");

exports.getWorkOrders = async (req, res) => {
    try {
        // Fetches work orders with batch traceability
        const result = await pool.query("SELECT * FROM work_orders ORDER BY target_date ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching work orders" });
    }
};

exports.updateStage = async (req, res) => {
    const { id } = req.params;
    const { stage, status } = req.body;
    try {
        await pool.query(
            "UPDATE work_orders SET stage = $1, status = $2 WHERE id = $3",
            [stage, status, id]
        );
        res.json({ message: "Stage updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to update production stage" });
    }
};

exports.createWorkOrder = async (req, res) => {
    const { batch_lot, stage, quantity, status, target_date, machine } = req.body;
    try {
        // Generate WO-YYYYMMDD-XXX ID
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `WO-${dateStr}-`;
        
        const lastWO = await pool.query(
            "SELECT wo_id FROM work_orders WHERE wo_id LIKE $1 ORDER BY wo_id DESC LIMIT 1",
            [prefix + '%']
        );
        
        let nextSeq = "001";
        if (lastWO.rows.length > 0) {
            const lastId = lastWO.rows[0].wo_id;
            const seq = parseInt(lastId.split('-')[2]);
            nextSeq = String(seq + 1).padStart(3, '0');
        }
        
        const newWoId = prefix + nextSeq;

        const result = await pool.query(
            `INSERT INTO work_orders 
             (wo_id, batch_lot, stage, quantity, status, start_date, target_date, machine)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) 
             RETURNING *`,
            [newWoId, batch_lot, stage, quantity, status || 'Planned', target_date, machine]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("CREATE WO ERROR:", err.message);
        res.status(500).json({ message: "Failed to create work order", error: err.message });
    }
};