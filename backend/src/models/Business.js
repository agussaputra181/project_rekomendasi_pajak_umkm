// Collection "businesses": profil usaha hasil wizard (SRS Tabel 15).
// address dan spouse disimpan sebagai sub-dokumen (embedded) karena selalu dibaca bersama profil.
const mongoose = require("mongoose");
const { ENTITY_TYPES, SECTORS, SALES_CHANNELS } = require("../constants/enums");
const { moneyField, schemaOptions } = require("../utils/money");

const businessSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    businessName: { type: String, required: [true, "Nama usaha wajib diisi"], trim: true, maxlength: 150 },
    entityType: { type: String, required: [true, "Bentuk usaha wajib dipilih"], enum: ENTITY_TYPES },
    registeredDate: { type: Date }, // tanggal mulai terdaftar sebagai wajib pajak
    facilityStartYear: { type: Number, min: 2013, max: 2100 }, // tahun mulai memakai PPh Final
    sector: { type: String, required: [true, "Sektor usaha wajib dipilih"], enum: SECTORS },
    salesChannels: { type: [{ type: String, enum: SALES_CHANNELS }], default: ["offline"] },
    hasEmployees: { type: Boolean, default: false },
    ownsBusinessProperty: { type: Boolean, default: false },
    hasNPWP: { type: Boolean, default: false },
    npwp: {
      type: String,
      trim: true,
      validate: { validator: (v) => !v || /^\d{15,16}$/.test(v), message: "NPWP harus 15 atau 16 digit angka" },
    },
    isPKP: { type: Boolean, default: false },
    marketplaceStatementSent: { type: Boolean, default: false },
    address: {
      street: { type: String, trim: true },
      district: { type: String, trim: true },
      city: { type: String, trim: true },
      province: { type: String, trim: true },
    },
    spouse: {
      hasBusiness: { type: Boolean, default: false },
      estimatedAnnualRevenue: moneyField(),
    },
    estimatedAnnualRevenue: moneyField(), // perkiraan omzet setahun (dipakai sebelum ada catatan omzet)
  },
  schemaOptions
);

module.exports = mongoose.model("Business", businessSchema);
