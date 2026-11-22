const express = require("express");
const reg = require("../controllers/regulationController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
const adminOnly = [protect, authorize("admin")];

router.route("/").get(reg.listRegulations).post(adminOnly, reg.createRegulation);
router.route("/:id").get(reg.getRegulation).put(adminOnly, reg.updateRegulation).delete(adminOnly, reg.deleteRegulation);

module.exports = router;
