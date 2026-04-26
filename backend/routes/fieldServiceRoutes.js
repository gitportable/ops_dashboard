const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const controller = require("../controllers/fieldServiceController");

router.use(auth);

router.get("/installations", controller.getInstallations);
router.post("/installations", controller.createInstallation);
router.get("/tickets", controller.getTickets);
router.post("/tickets", controller.createTicket);
router.put("/tickets/:id", controller.updateTicket);

module.exports = router;
