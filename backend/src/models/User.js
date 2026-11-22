// Collection "users": akun semua pengguna (SRS Tabel 14).
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../constants/enums");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nama wajib diisi"],
      trim: true,
      minlength: [3, "Nama minimal 3 karakter"],
      maxlength: [100, "Nama maksimal 100 karakter"],
    },
    email: {
      type: String,
      required: [true, "Email wajib diisi"],
      unique: true, // unique index: tidak boleh ada email ganda
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Format email tidak valid"],
    },
    password: {
      type: String,
      required: [true, "Password wajib diisi"],
      minlength: [8, "Password minimal 8 karakter"],
      select: false, // tidak pernah ikut terambil (dan terkirim) kecuali diminta
    },
    role: { type: String, enum: ROLES, default: "umkm" },
    phone: { type: String, trim: true },
    pendampingId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Sebelum disimpan: ubah password menjadi hash Bcrypt (cost factor 10)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// Hapus password dari hasil JSON untuk berjaga-jaga
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
