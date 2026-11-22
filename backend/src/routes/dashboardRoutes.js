const express = require("express");
const { getUmkmDashboard, getMonitoringDashboard } = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/umkm/:businessId", getUmkmDashboard);
router.get("/monitoring", authorize("pendamping", "admin"), getMonitoringDashboard);

module.exports = router;
