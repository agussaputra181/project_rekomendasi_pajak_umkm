// Data karyawan untuk PPh 21 (SRS FR-005).
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const httpError = require("../utils/httpError");
const findOwnedBusiness = require("../utils/findOwnedBusiness");
const pick = require("../utils/pick");
const { sendSuccess } = require("../utils/response");
const { generateRecommendation } = require("../services/recommendationService");

const FIELDS = ["name", "ptkpStatus", "employmentType", "monthlyGross", "pensionContribution", "joinDate", "isActive"];

async function findEmployee(id, user) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Data karyawan tidak ditemukan");
  const employee = await Employee.findById(id);
  if (!employee) throw httpError(404, "Data karyawan tidak ditemukan");
  const business = await findOwnedBusiness(employee.businessId, user, { write: true });
  return { employee, business };
}

// Profil "punya karyawan" diselaraskan otomatis, lalu rekomendasi dibuat ulang
async function syncBusiness(business) {
  const activeCount = await Employee.countDocuments({ businessId: business._id, isActive: true });
  if (business.hasEmployees !== activeCount > 0) {
    business.hasEmployees = activeCount > 0;
    await business.save();
  }
  await generateRecommendation(business);
}

// GET /api/v1/businesses/:id/employees
async function listEmployees(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user);
  const employees = await Employee.find({ businessId: business._id }).sort({ isActive: -1, name: 1 });
  sendSuccess(res, { message: "Daftar karyawan", data: employees });
}

// POST /api/v1/businesses/:id/employees
async function createEmployee(req, res) {
  const business = await findOwnedBusiness(req.params.id, req.user, { write: true });
  const employee = await Employee.create({ ...pick(req.body, FIELDS), businessId: business._id });
  await syncBusiness(business);
  sendSuccess(res, { statusCode: 201, message: "Karyawan ditambahkan", data: employee });
}

// PUT /api/v1/employees/:id
async function updateEmployee(req, res) {
  const { employee, business } = await findEmployee(req.params.id, req.user);
  employee.set(pick(req.body, FIELDS));
  await employee.save();
  await syncBusiness(business);
  sendSuccess(res, { message: "Data karyawan diperbarui", data: employee });
}

// DELETE /api/v1/employees/:id
async function deleteEmployee(req, res) {
  const { employee, business } = await findEmployee(req.params.id, req.user);
  await employee.deleteOne();
  await syncBusiness(business);
  sendSuccess(res, { message: "Karyawan dihapus" });
}

module.exports = { listEmployees, createEmployee, updateEmployee, deleteEmployee };
