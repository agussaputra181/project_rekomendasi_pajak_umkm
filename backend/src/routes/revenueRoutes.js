const express = require("express");
const { updateRevenue, deleteRevenue } = require("../controllers/revenueController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("umkm"));
router.route("/:id").put(updateRevenue).delete(deleteRevenue);

module.exports = router;
