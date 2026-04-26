const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const controller = require("../controllers/supplyChainController");

router.use(auth);

router.get("/vendors", controller.getVendors);
router.post("/vendors", controller.createVendor);
router.get("/pos", controller.getPurchaseOrders);
router.post("/pos", controller.createPO);
router.get("/inventory", controller.getInventory);
router.put("/pos/:id", controller.updatePOStatus);

module.exports = router;
