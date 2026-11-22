const express = require("express");
const { updateEmployee, deleteEmployee } = require("../controllers/employeeController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("umkm"));
router.route("/:id").put(updateEmployee).delete(deleteEmployee);

module.exports = router;
