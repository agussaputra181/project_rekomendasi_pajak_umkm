// Collection "tax_rules": parameter pajak berversi (SRS Tabel 22).
// Hanya satu versi aktif per taxType; versi lama tetap disimpan agar hasil lama dapat ditelusuri.
const mongoose = require("mongoose");
const { TAX_RULE_TYPES, MECHANISMS } = require("../constants/enums");

const taxRuleSchema = new mongoose.Schema(
  {
    taxType: { type: String, enum: TAX_RULE_TYPES, required: [true, "Jenis pajak wajib dipilih"] },
    parameters: { type: Object, required: [true, "Parameter wajib diisi"] },
    base: { type: String, trim: true }, // dasar pengenaan
    mechanism: { type: String, enum: MECHANISMS, default: "setor_sendiri" },
    dueRule: {
      payDay: { type: Number, default: null },
      reportDay: { type: Number, default: null },
      payEndOfNextMonth: { type: Boolean, default: false },
      annualDeadline: { type: String, default: null }, // "DD-MM", misalnya "31-03"
    },
    effectiveFrom: { type: Date, required: [true, "Tanggal mulai berlaku wajib diisi"] },
    effectiveTo: { type: Date, default: null }, // kosong = masih berlaku
    version: { type: Number, required: true },
    regulationId: { type: mongoose.Schema.Types.ObjectId, ref: "Regulation" },
    isActive: { type: Boolean, default: false },
    note: { type: String, trim: true }, // alasan perubahan versi
  },
  { timestamps: true }
);

taxRuleSchema.index({ taxType: 1, isActive: 1, effectiveFrom: -1 });
taxRuleSchema.index({ taxType: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("TaxRule", taxRuleSchema, "tax_rules");
