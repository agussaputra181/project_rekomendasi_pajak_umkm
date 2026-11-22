// Rate limiting login (SRS TC-API-06): lebih dari 5 percobaan GAGAL dalam 15 menit -> 429.
const { rateLimit } = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 5, // maksimal 5 percobaan gagal
  skipSuccessfulRequests: true, // login yang berhasil tidak dihitung
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      status: "error",
      message: "Terlalu banyak percobaan login. Coba lagi 15 menit lagi.",
      errors: [],
    }),
});

module.exports = { loginLimiter };
