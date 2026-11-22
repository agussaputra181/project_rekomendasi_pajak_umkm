// Nilai uang disimpan sebagai Decimal128 di MongoDB (SRS 3.2) agar tidak ada galat pembulatan.
// Di JavaScript kita hitung sebagai Number dalam rupiah penuh.

// Mengubah Decimal128 / string / Number menjadi Number
function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "object" && typeof value.toString === "function") return Number(value.toString());
  return Number(value);
}

// Pembulatan rupiah ke bawah tanpa desimal (NFR Akurasi)
function floorRupiah(value) {
  return Math.floor(toNumber(value) + 1e-9); // 1e-9 mencegah 399999.99999 akibat galat desimal
}

// Definisi field uang untuk skema Mongoose
function moneyField(extra = {}) {
  const mongoose = require("mongoose");
  return {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    get: toNumber, // saat dibaca, otomatis menjadi Number
    validate: { validator: (v) => toNumber(v) >= 0, message: "Nilai uang tidak boleh negatif" },
    ...extra,
  };
}

// Opsi skema agar getter (Decimal128 -> Number) ikut dipakai saat dikirim sebagai JSON
const schemaOptions = { timestamps: true, toJSON: { getters: true, virtuals: false }, toObject: { getters: true, virtuals: false }, id: false };

// Format "Rp1.500.000" untuk langkah perhitungan
function rupiah(value) {
  return "Rp" + floorRupiah(value).toLocaleString("id-ID");
}

module.exports = { toNumber, floorRupiah, moneyField, schemaOptions, rupiah };
