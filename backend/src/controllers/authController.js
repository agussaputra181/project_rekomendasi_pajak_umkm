// Registrasi, login, data pengguna aktif, dan ganti password (SRS FR-001).
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const httpError = require("../utils/httpError");
const { sendSuccess } = require("../utils/response");

// Token berisi id dan role pengguna, berlaku 1 jam (SRS 3.6)
function createToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1h" });
}

const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, pendampingId: u.pendampingId || null });

// POST /api/v1/auth/register
async function register(req, res) {
  const { name, email, password, phone } = req.body;
  // Registrasi publik selalu role "umkm"; field role dari body diabaikan
  const user = await User.create({ name, email, password, phone, role: "umkm" });
  sendSuccess(res, { statusCode: 201, message: "Registrasi berhasil", data: { token: createToken(user), user: publicUser(user) } });
}

// POST /api/v1/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    throw httpError(400, "Email dan password wajib diisi", [
      ...(!email ? [{ field: "email", message: "Email wajib diisi" }] : []),
      ...(!password ? [{ field: "password", message: "Password wajib diisi" }] : []),
    ]);
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  // Pesan dibuat umum agar tidak membocorkan apakah email terdaftar
  if (!user || !(await user.matchPassword(password)) || !user.isActive) {
    throw httpError(401, "Email atau password salah");
  }
  sendSuccess(res, { message: "Login berhasil", data: { token: createToken(user), user: publicUser(user) } });
}

// GET /api/v1/auth/me
async function getMe(req, res) {
  sendSuccess(res, { message: "Data pengguna", data: publicUser(req.user) });
}

// PUT /api/v1/auth/password
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    throw httpError(400, "Password baru belum valid", [{ field: "newPassword", message: "Password baru minimal 8 karakter" }]);
  }
  const user = await User.findById(req.user._id).select("+password");
  if (typeof currentPassword !== "string" || !(await user.matchPassword(currentPassword))) {
    throw httpError(401, "Password lama salah");
  }
  user.password = newPassword;
  await user.save(); // otomatis di-hash oleh pre("save")
  sendSuccess(res, { message: "Password berhasil diganti" });
}

module.exports = { register, login, getMe, changePassword };
