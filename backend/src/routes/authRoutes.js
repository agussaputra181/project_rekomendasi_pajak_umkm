const express = require("express");
const { register, login, getMe, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", register);
router.post("/login", loginLimiter, login); // dibatasi 5 percobaan gagal / 15 menit
router.get("/me", protect, getMe);
router.put("/password", protect, changePassword);

module.exports = router;
