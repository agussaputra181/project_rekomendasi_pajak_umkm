// Collection "revenues": omzet per bulan per usaha (SRS Tabel 16).
const mongoose = require("mongoose");
const { moneyField, schemaOptions, toNumber } = require("../utils/money");

const revenueSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    year: { type: Number, required: [true, "Tahun wajib diisi"], min: [2024, "Tahun minimal 2024"], max: [2100, "Tahun maksimal 2100"] },
    month: { type: Number, required: [true, "Bulan wajib diisi"], min: [1, "Bulan 1-12"], max: [12, "Bulan 1-12"] },
    amount: moneyField({ required: [true, "Omzet wajib diisi"] }),
    channels: {
      offline: moneyField(),
      marketplace: moneyField(),
      pemerintah: moneyField(),
    },
    pph22Collected: moneyField(), // PPh 22 yang sudah dipungut marketplace/bendahara
    note: { type: String, trim: true, maxlength: 300 },
  },
  schemaOptions
);

// Satu usaha hanya boleh punya satu catatan untuk bulan & tahun yang sama
revenueSchema.index({ businessId: 1, year: 1, month: 1 }, { unique: true });

// Rincian kanal harus sama dengan total omzet (SRS TC-API-10)
revenueSchema.pre("validate", function () {
  const c = this.channels || {};
  const sum = toNumber(c.offline) + toNumber(c.marketplace) + toNumber(c.pemerintah);
  if (Math.abs(sum - toNumber(this.amount)) > 0.5) {
    this.invalidate("channels", "Jumlah rincian kanal harus sama dengan total omzet");
  }
  if (toNumber(this.pph22Collected) > toNumber(this.amount)) {
    this.invalidate("pph22Collected", "PPh 22 dipungut tidak boleh lebih besar dari omzet");
  }
});

module.exports = mongoose.model("Revenue", revenueSchema);
