// Collection "employees": data karyawan untuk PPh 21 (SRS Tabel 17).
const mongoose = require("mongoose");
const { PTKP_STATUSES, EMPLOYMENT_TYPES, TER_CATEGORY } = require("../constants/enums");
const { moneyField, schemaOptions } = require("../utils/money");

const employeeSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    name: { type: String, required: [true, "Nama karyawan wajib diisi"], trim: true, maxlength: 100 },
    ptkpStatus: { type: String, enum: PTKP_STATUSES, default: "TK/0" },
    terCategory: { type: String, enum: ["A", "B", "C"] }, // diisi otomatis dari ptkpStatus
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: "tetap" },
    monthlyGross: moneyField({ required: [true, "Gaji bruto bulanan wajib diisi"] }),
    pensionContribution: moneyField(), // iuran pensiun/JHT yang dibayar pegawai per bulan
    joinDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  schemaOptions
);

employeeSchema.index({ businessId: 1, isActive: 1 });

// Kategori TER dihitung sistem, pengguna tidak perlu mengisi
employeeSchema.pre("validate", function () {
  this.terCategory = TER_CATEGORY[this.ptkpStatus] || "A";
});

module.exports = mongoose.model("Employee", employeeSchema);
