const express = require("express");
const advice = require("../controllers/adviceRuleController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("admin"));

router.route("/").get(advice.listAdviceRules).post(advice.createAdviceRule);
router.route("/:id").put(advice.updateAdviceRule).delete(advice.deactivateAdviceRule);

module.exports = router;
