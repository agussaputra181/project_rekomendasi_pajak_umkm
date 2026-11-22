// Menggabungkan semua route di bawah prefix /api/v1 (SRS Tabel 27)
const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/businesses", require("./businessRoutes"));
router.use("/revenues", require("./revenueRoutes"));
router.use("/employees", require("./employeeRoutes"));
router.use("/recommendations", require("./recommendationRoutes"));
router.use("/calculations", require("./calculationRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/regulations", require("./regulationRoutes"));
router.use("/tax-rules", require("./taxRuleRoutes"));
router.use("/advice-rules", require("./adviceRuleRoutes"));
router.use("/articles", require("./articleRoutes"));
router.use("/dashboard", require("./dashboardRoutes"));

module.exports = router;
