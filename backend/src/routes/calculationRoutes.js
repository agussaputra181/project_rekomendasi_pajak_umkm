const express = require("express");
const calc = require("../controllers/calculationController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("umkm"));

router.post("/pph-final", calc.pphFinal);
router.post("/pph-badan", calc.pphBadan);
router.post("/pph21", calc.pph21);
router.post("/compare-scheme", calc.compareScheme);
router.post("/ppn", calc.ppn);

module.exports = router;
