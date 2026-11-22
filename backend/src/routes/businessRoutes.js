// Usaha + route bersarang untuk data milik satu usaha (omzet, karyawan, rekomendasi, riwayat, jatuh tempo).
const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const business = require("../controllers/businessController");
const revenue = require("../controllers/revenueController");
const employee = require("../controllers/employeeController");
const recommendation = require("../controllers/recommendationController");
const calculation = require("../controllers/calculationController");
const deadline = require("../controllers/deadlineController");

const router = express.Router();
router.use(protect); // semua route di file ini wajib login

router.route("/").get(business.listBusinesses).post(authorize("umkm"), business.createBusiness);
router
  .route("/:id")
  .get(business.getBusiness)
  .put(authorize("umkm"), business.updateBusiness)
  .delete(authorize("umkm"), business.deleteBusiness);

router.route("/:id/revenues").get(revenue.listRevenues).post(authorize("umkm"), revenue.createRevenue);
router.route("/:id/employees").get(employee.listEmployees).post(authorize("umkm"), employee.createEmployee);
router.post("/:id/recommendations/generate", authorize("umkm"), recommendation.generate);
router.get("/:id/recommendations/latest", recommendation.getLatest);
router.get("/:id/calculations", calculation.history);
router.get("/:id/deadlines", deadline.listDeadlines);

module.exports = router;
