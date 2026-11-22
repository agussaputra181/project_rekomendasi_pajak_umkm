const express = require("express");
const { toggleAction } = require("../controllers/recommendationController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.patch("/:id/actions/:actionId", protect, authorize("umkm"), toggleAction);

module.exports = router;
