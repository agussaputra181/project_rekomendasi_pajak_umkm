// Manajemen pengguna oleh Admin (SRS FR-002): daftar, detail, ubah, tetapkan pendamping, nonaktifkan.
const mongoose = require("mongoose");
const User = require("../models/User");
const Business = require("../models/Business");
const httpError = require("../utils/httpError");
const pick = require("../utils/pick");
const { sendSuccess, getPagination, buildPagination } = require("../utils/response");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function findUser(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Pengguna tidak ditemukan");
  const user = await User.findById(id).populate("pendampingId", "name email");
  if (!user) throw httpError(404, "Pengguna tidak ditemukan");
  return user;
}

// GET /api/v1/users?page=&limit=&role=&q=&isActive=
async function listUsers(req, res) {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive === "true" || req.query.isActive === "false") filter.isActive = req.query.isActive === "true";
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(String(req.query.q)), "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).populate("pendampingId", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  sendSuccess(res, { message: "Daftar pengguna", data: users, pagination: buildPagination(page, limit, total) });
}

// GET /api/v1/users/:id
async function getUser(req, res) {
  const user = await findUser(req.params.id);
  const businesses = await Business.find({ userId: user._id }).select("businessName entityType");
  sendSuccess(res, { message: "Detail pengguna", data: { ...user.toJSON(), businesses } });
}

// PUT /api/v1/users/:id   body: { name, phone, role, isActive }
async function updateUser(req, res) {
  const user = await findUser(req.params.id);
  if (user._id.equals(req.user._id) && (req.body.role && req.body.role !== "admin" || req.body.isActive === false)) {
    throw httpError(400, "Admin tidak dapat menurunkan role atau menonaktifkan akunnya sendiri");
  }
  Object.assign(user, pick(req.body, ["name", "phone", "role", "isActive"]));
  if (user.role !== "umkm") user.pendampingId = undefined; // pendamping hanya untuk akun UMKM
  await user.save();
  sendSuccess(res, { message: "Data pengguna diperbarui", data: user });
}

// PATCH /api/v1/users/:id/pendamping   body: { pendampingId } (null untuk melepas)
async function assignPendamping(req, res) {
  const user = await findUser(req.params.id);
  if (user.role !== "umkm") throw httpError(400, "Pendamping hanya dapat ditetapkan untuk akun UMKM");
  const { pendampingId } = req.body;
  if (pendampingId) {
    const pendamping = mongoose.isValidObjectId(pendampingId) ? await User.findById(pendampingId) : null;
    if (!pendamping || pendamping.role !== "pendamping" || !pendamping.isActive) throw httpError(404, "Pendamping tidak ditemukan");
    user.pendampingId = pendamping._id;
  } else {
    user.pendampingId = undefined;
  }
  await user.save();
  sendSuccess(res, { message: "Pendamping ditetapkan", data: await findUser(user._id) });
}

// DELETE /api/v1/users/:id   -> menonaktifkan akun (data usaha tetap tersimpan)
async function deactivateUser(req, res) {
  const user = await findUser(req.params.id);
  if (user._id.equals(req.user._id)) throw httpError(400, "Admin tidak dapat menonaktifkan akunnya sendiri");
  user.isActive = false;
  await user.save();
  sendSuccess(res, { message: "Pengguna dinonaktifkan", data: user });
}

module.exports = { listUsers, getUser, updateUser, assignPendamping, deactivateUser };
