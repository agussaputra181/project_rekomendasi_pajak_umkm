// Mengambil data usaha sekaligus memeriksa hak akses (otorisasi kepemilikan data):
// - umkm       : hanya usahanya sendiri (baca & ubah)
// - pendamping : hanya usaha UMKM binaannya (hanya baca)
// - admin      : semua usaha (hanya baca)
const mongoose = require("mongoose");
const Business = require("../models/Business");
const User = require("../models/User");
const httpError = require("./httpError");

async function findOwnedBusiness(businessId, user, { write = false } = {}) {
  if (!mongoose.isValidObjectId(businessId)) throw httpError(404, "Data usaha tidak ditemukan");
  const business = await Business.findById(businessId);
  if (!business) throw httpError(404, "Data usaha tidak ditemukan");

  const isOwner = business.userId.equals(user._id);
  if (isOwner) return business;
  if (write) throw httpError(403, "Hanya pemilik usaha yang dapat mengubah data ini");

  if (user.role === "admin") return business;
  if (user.role === "pendamping") {
    const owner = await User.findById(business.userId);
    if (owner && owner.pendampingId && owner.pendampingId.equals(user._id)) return business;
  }
  throw httpError(403, "Anda tidak berhak mengakses data usaha ini");
}

module.exports = findOwnedBusiness;
