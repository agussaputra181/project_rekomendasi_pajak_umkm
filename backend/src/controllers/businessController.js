// CRUD profil usaha hasil wizard (SRS FR-003). Setiap simpan -> rekomendasi dibuat ulang.
const Business = require("../models/Business");
const Revenue = require("../models/Revenue");
const Employee = require("../models/Employee");
const Recommendation = require("../models/Recommendation");
const TaxCalculation = require("../models/TaxCalculation");
const Notification = require("../models/Notification");
const findOwnedBusiness = require("../utils/findOwnedBusiness");
const pick = require("../utils/pick");
const { sendSuccess } = require("../utils/response");
const { generateRecommendation } = require("../services/recommendationService");
const { scopeBusinessIds } = require("../services/dashboardService");

// Field yang boleh diisi dari wizard (userId tidak boleh diisi pengguna)
const FIELDS = [
  "businessName", "entityType", "registeredDate", "facilityStartYear", "sector", "salesChannels",
  "hasEmployees", "ownsBusinessProperty", "hasNPWP", "npwp", "isPKP", "marketplaceStatementSent",
  "address", "spouse", "estimatedAnnualRevenue",
];

// POST /api/v1/businesses
async function createBusiness(req, res) {
  const business = await Business.create({ ...pick(req.body, FIELDS), userId: req.user._id });
  const recommendation = await generateRecommendation(business);
  sendSuccess(res, { statusCode: 201, message: "Profil usaha tersimpan dan rekomendasi dibuat", data: { business, recommendation } });
}

// GET /api/v1/businesses  (umkm: miliknya; pendamping: binaannya; admin: semua)
async function listBusinesses(req, res) {
  const filter = req.user.role === "umkm" ? { userId: req.user._id } : { _id: { $in: await scopeBusinessIds(req.user) } };
  const businesses = await Business.find(filter).populate("userId", "name email").sort({ createdAt: 1 });
  sendSuccess(res, { message: "Daftar usaha", data: businesses });
}

// GET /api/v1/businesses/:id
async function getBusiness(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user);
  sendSuccess(res, { message: "Detail usaha", data: business });
}

// PUT /api/v1/businesses/:id
async function updateBusiness(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user, { write: true });
  business.set(pick(req.body, FIELDS));
  await business.save(); // save() menjalankan validasi skema
  const recommendation = await generateRecommendation(business);
  sendSuccess(res, { message: "Profil usaha diperbarui dan rekomendasi dibuat ulang", data: { business, recommendation } });
}

// DELETE /api/v1/businesses/:id  -> menghapus usaha beserta datanya
async function deleteBusiness(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user, { write: true });
  const businessId = business._id;
  await Promise.all([
    Revenue.deleteMany({ businessId }),
    Employee.deleteMany({ businessId }),
    Recommendation.deleteMany({ businessId }),
    TaxCalculation.deleteMany({ businessId }),
    Notification.deleteMany({ businessId }),
  ]);
  await business.deleteOne();
  sendSuccess(res, { message: "Usaha dan seluruh datanya dihapus" });
}

module.exports = { createBusiness, listBusinesses, getBusiness, updateBusiness, deleteBusiness };
