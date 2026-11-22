// Mengisi database dengan data awal: aturan tarif v1, aturan saran R-01..R-15, regulasi, artikel,
// akun contoh, usaha contoh, omzet, dan karyawan. Jalankan: npm run seed
// PERHATIAN: semua data lama di database akan dihapus.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Business = require("./models/Business");
const Revenue = require("./models/Revenue");
const Employee = require("./models/Employee");
const Recommendation = require("./models/Recommendation");
const TaxCalculation = require("./models/TaxCalculation");
const Notification = require("./models/Notification");
const Regulation = require("./models/Regulation");
const TaxRule = require("./models/TaxRule");
const AdviceRule = require("./models/AdviceRule");
const Article = require("./models/Article");
const { DEFAULT_TAX_RULES } = require("./constants/defaultTaxRules");
const { DEFAULT_ADVICE_RULES } = require("./constants/defaultAdviceRules");
const { REGULATIONS, ARTICLES } = require("./constants/seedContent");
const { generateRecommendation } = require("./services/recommendationService");

const YEAR = new Date().getFullYear();

async function seedRules() {
  const regulations = await Regulation.insertMany(REGULATIONS);
  const regId = (number) => (regulations.find((r) => r.number === number) || {})._id;
  // PP 55/2022 diubah oleh PP 20/2026
  await Regulation.updateOne({ number: "PP 55/2022" }, { replacedBy: regId("PP 20/2026") });

  await TaxRule.insertMany(
    DEFAULT_TAX_RULES.map(({ regulationNumber, ...rule }) => ({
      ...rule,
      regulationId: regulationNumber ? regId(regulationNumber) : undefined,
      effectiveFrom: new Date("2026-01-01"),
      version: 1,
      isActive: true,
      note: "Nilai awal",
    }))
  );
  await AdviceRule.insertMany(
    DEFAULT_ADVICE_RULES.map(({ regulationNumbers, ...rule }) => ({ ...rule, regulationIds: regulationNumbers.map(regId).filter(Boolean), version: 1, isActive: true }))
  );
  return { regId };
}

async function seedArticles(regId, adminId) {
  await Article.insertMany(
    ARTICLES.map(({ regs, ...a }) => ({ ...a, slug: Article.slugify(a.title), regulationIds: regs.map(regId).filter(Boolean), authorId: adminId, isPublished: true }))
  );
}

// Omzet bulan 1..lastMonth tahun berjalan; channels dibagi offline/marketplace
async function addRevenues(businessId, amounts, { marketplaceShare = 0, pph22 = () => 0 } = {}) {
  const docs = amounts.map((amount, i) => {
    const marketplace = Math.round(amount * marketplaceShare);
    return { businessId, year: YEAR, month: i + 1, amount, channels: { offline: amount - marketplace, marketplace, pemerintah: 0 }, pph22Collected: pph22(i, marketplace) };
  });
  for (const doc of docs) await Revenue.create(doc); // create satu per satu agar validasi rincian kanal berjalan
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Tersambung. Menghapus data lama...");
  await Promise.all([User, Business, Revenue, Employee, Recommendation, TaxCalculation, Notification, Regulation, TaxRule, AdviceRule, Article].map((m) => m.deleteMany({})));

  const { regId } = await seedRules();

  const admin = await User.create({ name: "Admin Pajak UMKM", email: "admin@pajakumkm.id", password: "admin12345", role: "admin" });
  const pendamping = await User.create({ name: "Dewi Lestari", email: "pendamping@pajakumkm.id", password: "pendamping123", role: "pendamping", phone: "081234567890" });
  const sari = await User.create({ name: "Sari Wulandari", email: "sari@contoh.id", password: "umkm12345", role: "umkm", phone: "081300000001", pendampingId: pendamping._id });
  const budi = await User.create({ name: "Budi Santoso", email: "budi@contoh.id", password: "umkm12345", role: "umkm", phone: "081300000002", pendampingId: pendamping._id });
  const made = await User.create({ name: "Made Arsana", email: "made@contoh.id", password: "umkm12345", role: "umkm", pendampingId: pendamping._id });
  const rina = await User.create({ name: "Rina Kartika", email: "rina@contoh.id", password: "umkm12345", role: "umkm" });

  await seedArticles(regId, admin._id);

  const lastMonth = Math.max(1, new Date().getMonth()); // sampai bulan lalu

  // 1) Orang pribadi kuliner, jual di marketplace, punya karyawan, omzet mendekati Rp500 juta
  const warung = await Business.create({
    userId: sari._id, businessName: "Warung Bu Sari", entityType: "OP", sector: "kuliner", registeredDate: new Date("2019-03-01"),
    salesChannels: ["offline", "marketplace"], hasEmployees: true, hasNPWP: true, npwp: "3171012345670001",
    address: { street: "Jl. Tukad Badung 12", district: "Denpasar Selatan", city: "Denpasar", province: "Bali" },
    spouse: { hasBusiness: false, estimatedAnnualRevenue: 0 }, estimatedAnnualRevenue: 520000000,
  });
  await addRevenues(warung._id, [38, 41, 44, 40, 45, 43, 42, 46, 44, 45, 47, 48].slice(0, lastMonth).map((m) => m * 1e6), { marketplaceShare: 0.3 });
  await Employee.insertMany([
    { businessId: warung._id, name: "Komang Ayu", ptkpStatus: "TK/0", employmentType: "tetap", monthlyGross: 4200000, joinDate: new Date("2023-02-01") },
    { businessId: warung._id, name: "Putu Gede", ptkpStatus: "K/1", employmentType: "tetap", monthlyGross: 7500000, pensionContribution: 75000, joinDate: new Date("2021-07-01") },
  ]);

  // 2) PT Perorangan, omzet besar (tanpa bagian bebas), sebagian omzet belum dicatat
  const toko = await Business.create({
    userId: budi._id, businessName: "PT Budi Elektronik Mandiri", entityType: "PT_PERORANGAN", sector: "dagang", registeredDate: new Date("2023-05-10"), facilityStartYear: 2023,
    salesChannels: ["offline", "marketplace", "pemerintah"], hasNPWP: true, npwp: "0123456789012345", ownsBusinessProperty: true,
    address: { city: "Badung", province: "Bali" }, estimatedAnnualRevenue: 1800000000,
  });
  await addRevenues(toko._id, [140, 150, 155, 160, 150, 165, 170, 160].slice(0, Math.max(1, lastMonth - 2)).map((m) => m * 1e6), { marketplaceShare: 0.4, pph22: (i, mp) => Math.round(mp * 0.005) });

  // 3) Koperasi (masa transisi PP 20/2026 sampai 2029)
  await Business.create({
    userId: made._id, businessName: "Koperasi Tani Makmur", entityType: "KOPERASI", sector: "produksi", registeredDate: new Date("2020-02-01"), facilityStartYear: 2020,
    salesChannels: ["offline"], hasNPWP: true, address: { city: "Tabanan", province: "Bali" }, estimatedAnnualRevenue: 900000000,
  });

  // 4) CV terdaftar setelah PP 20/2026 -> tarif umum
  await Business.create({
    userId: rina._id, businessName: "CV Rina Kreatif", entityType: "CV", sector: "jasa", registeredDate: new Date("2026-06-10"),
    salesChannels: ["offline"], hasNPWP: false, address: { city: "Gianyar", province: "Bali" }, estimatedAnnualRevenue: 2000000000,
  });

  for (const business of await Business.find()) await generateRecommendation(business);

  console.log("Seed selesai. Akun contoh:");
  console.log("  Admin      : admin@pajakumkm.id / admin12345");
  console.log("  Pendamping : pendamping@pajakumkm.id / pendamping123");
  console.log("  UMKM       : sari@contoh.id, budi@contoh.id, made@contoh.id, rina@contoh.id / umkm12345");
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed gagal:", error);
  await mongoose.disconnect();
  process.exit(1);
});
