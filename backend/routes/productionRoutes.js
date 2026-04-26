const router = require("express").Router();
const auth = require("../middleware/auth");
const controller = require("../controllers/productionController");

router.use(auth);

router.get("/workorders", controller.getWorkOrders);
router.post("/workorders", controller.createWorkOrder);
router.put("/workorders/:id", controller.updateStage);

module.exports = router;
