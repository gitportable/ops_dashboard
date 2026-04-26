const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const controller = require("../controllers/qaController");

router.use(auth);

router.get("/defects", controller.getDefects);
router.post("/defects", controller.createDefect);
router.get("/defects/stats", controller.getDefectStats);
router.put("/defects/:id/rca", controller.updateRCA);
router.post("/defects/:id/image", controller.uploadDefectImage);

module.exports = router;
