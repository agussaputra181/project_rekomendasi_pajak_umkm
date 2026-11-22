//Daftar pilihan (enum) yang dipakai di banyak file, supaya konsisten dan mudah diubah.
const ROLES = ["umkm", "pendamping", "admin"];
const ENTITY_TYPES = ["OP", "PT_PERORANGAN", "KOPERASI", "CV", "FIRMA", "PT", "BUMDES"];
const BADAN_NON_FINAL = ["CV", "FIRMA", "PT", "BUMDES"]; // badan hukum yang tidak lagi berhak PPh Final (PP20/2026)
const SECTORS = ["dagang", "kuliner", "produksi", "jasa", "pekerjaan_bebas", "lainnya"];
const SALES_CHANNELS = ["offline", "marketplace", "pemerintah"];
const PTKP_STATUSES = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"];
const EMPLOYMENT_TYPES = ["tetap", "tidak_tetap"];
const CALCULATION_TYPES = ["PPH_FINAL", "PPH_BADAN", "PPH21", "PPN", "COMPARE"];
const NOTIFICATION_TYPES = ["DEADLINE", "THRESHOLD", "RULE_UPDATE", "INFO"];
const REGULATION_TYPES = ["UU", "PP", "PMK", "PER_DJP", "PERDA"];
const REGULATION_STATUSES = ["berlaku", "diubah", "dicabut"];
const TAX_RULE_TYPES = [
  "PPH_FINAL_UMKM", "PPH_BADAN", "PPH21_TER", "PPH21_PASAL17", "PTKP",
  "PPN", "PPH22_PMSE", "PPH22_PEMERINTAH", "PBJT",
  "HARI_LIBUR", // daftar hari libur nasional & cuti bersama (SRS 3.4: "disimpan sebagai data")
];
const MECHANISMS = ["setor_sendiri", "dipotong", "dipungut"];
const ARTICLE_CATEGORIES = ["glosarium", "panduan", "faq", "berita_aturan"];
const CONDITION_OPERATORS = ["eq", "ne", "in", "nin", "gt", "gte", "lt", "lte", "before", "after"];

// Kategori TER PPh 21 dari status PTKP (PP 58/2023)
const TER_CATEGORY = {
  "TK/0": "A", "TK/1": "A", "K/0": "A",
  "TK/2": "B", "TK/3": "B", "K/1": "B", "K/2": "B",
  "K/3": "C",
};

module.exports = {
  ROLES, ENTITY_TYPES, BADAN_NON_FINAL, SECTORS, SALES_CHANNELS, PTKP_STATUSES, EMPLOYMENT_TYPES,
  CALCULATION_TYPES, NOTIFICATION_TYPES, REGULATION_TYPES, REGULATION_STATUSES, TAX_RULE_TYPES,
  MECHANISMS, ARTICLE_CATEGORIES, CONDITION_OPERATORS, TER_CATEGORY,
};
