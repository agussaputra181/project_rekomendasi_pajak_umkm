const express = require("express");
const rule = require("../controllers/taxRuleController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("admin"));

router.route("/").get(rule.listTaxRules).post(rule.createTaxRule);
router.put("/:id", rule.updateTaxRule);
router.post("/:id/test", rule.testTaxRule);
router.post("/:id/activate", rule.activateTaxRule);

module.exports = router;
