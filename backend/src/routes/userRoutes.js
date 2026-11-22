// src/routes/userRoutes.js  (khusus Admin)
const express = require("express");
const user = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("admin"));

router.get("/", user.listUsers);
router.get("/:id", user.getUser);
router.put("/:id", user.updateUser);
router.patch("/:id/pendamping", user.assignPendamping);
router.delete("/:id", user.deactivateUser);

module.exports = router;
