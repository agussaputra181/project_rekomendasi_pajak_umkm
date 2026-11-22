//protect       : request wajib membawa token JWT yang valid (401 jika tidak ada atau tidak valid)
//authorize     : role pengguna harus sesuai (403 jika tidak sesuai)
//optionalAuth  : jika ada token yang valid, isi req.user; jika tidak, lanjut sebagai tamu
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const httpError = require("../utils/httpError");

async function readUserFromToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // melempar error jika palsu/kedaluwarsa
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw httpError(401, "Akun tidak ditemukan atau nonaktif");
  return user;
}

async function protect(req, res, next) {
  try {
    const user = await readUserFromToken(req);
    if (!user) throw httpError(401, "Silakan login terlebih dahulu");
    req.user = user;
    next();
  } catch (error) {
    next(httpError(401, error.statusCode === 401 ? error.message : "Sesi tidak valid atau kedaluwarsa, silakan login lagi"));
  }
}

async function optionalAuth(req, res, next) {
  try {
    req.user = await readUserFromToken(req);
  } catch {
    req.user = null;
  }
  next();
}

// Contoh: authorize("admin") atau authorize("pendamping", "admin")
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(httpError(403, "Anda tidak memiliki akses ke fitur ini"));
    }
    next();
  };
}

module.exports = { protect, authorize, optionalAuth };

