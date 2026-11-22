// Rule engine rekomendasi (SRS 3.4). Langkahnya:
// 1) buildContext   : menyusun data konteks dari profil usaha, omzet, dan parameter tax_rules aktif
// 2) evaluateRule   : mencocokkan kondisi setiap advice_rule (semua kondisi digabung AND)
// 3) renderTemplate : mengisi variabel {omzetKumulatif} dsb. pada teks penjelasan
const { BADAN_NON_FINAL } = require("../constants/enums");
const { toNumber, rupiah } = require("../utils/money");

// Daftar field konteks yang boleh dipakai di kondisi advice_rules (ditampilkan di halaman Admin)
const CONTEXT_FIELDS = [
  { field: "entityType", type: "pilihan", description: "Bentuk usaha (OP, PT_PERORANGAN, KOPERASI, CV, FIRMA, PT, BUMDES)" },
  { field: "sector", type: "pilihan", description: "Sektor usaha" },
  { field: "salesChannels", type: "daftar", description: "Kanal penjualan (offline, marketplace, pemerintah)" },
  { field: "hasEmployees", type: "ya/tidak", description: "Memiliki karyawan" },
  { field: "ownsBusinessProperty", type: "ya/tidak", description: "Memiliki tanah/bangunan usaha" },
  { field: "hasNPWP", type: "ya/tidak", description: "NPWP/NIK aktif di Coretax" },
  { field: "isPKP", type: "ya/tidak", description: "Sudah Pengusaha Kena Pajak" },
  { field: "marketplaceStatementSent", type: "ya/tidak", description: "Surat pernyataan ke marketplace sudah dikirim" },
  { field: "cumulativeRevenue", type: "angka", description: "Omzet tercatat tahun berjalan (usaha ini)" },
  { field: "annualRevenue", type: "angka", description: "Omzet setahun usaha ini (tercatat atau perkiraan, ambil yang terbesar)" },
  { field: "combinedRevenue", type: "angka", description: "Omzet gabungan: usaha OP/PT Perorangan milik pengguna + omzet pasangan" },
  { field: "facilityYearsUsed", type: "angka", description: "Lama memakai PPh Final (tahun pajak)" },
  { field: "registeredDate", type: "tanggal", description: "Tanggal terdaftar sebagai wajib pajak" },
  { field: "withinCooperativePeriod", type: "ya/tidak", description: "Bukan koperasi, atau koperasi yang masa PPh Final-nya belum habis" },
  { field: "transitionActive", type: "ya/tidak", description: "Badan (CV/Firma/PT/BUMDes) masih dalam masa transisi PPh Final" },
  { field: "generalSchemeRequired", type: "ya/tidak", description: "Omzet gabungan > batas ATAU masa koperasi habis" },
  { field: "pph22Withheld", type: "ya/tidak", description: "Marketplace memungut PPh 22 (omzet > Rp500 juta ATAU bukan OP)" },
  { field: "mustBePKP", type: "ya/tidak", description: "Omzet (tanpa omzet kena PBJT) > batas PKP ATAU sudah PKP" },
  { field: "nearThreshold", type: "ya/tidak", description: "Omzet mencapai 80% batas Rp500 juta atau Rp4,8 miliar" },
  { field: "ceiling", type: "angka", description: "Batas omzet PPh Final (dari tax_rules)" },
  { field: "opExemption", type: "angka", description: "Batas omzet bebas orang pribadi (dari tax_rules)" },
];

/**
 * @param business    dokumen Business
 * @param data.revenueTotal      omzet tercatat tahun berjalan usaha ini
 * @param data.otherOwnRevenue   omzet setahun usaha OP/PT Perorangan lain milik pengguna yang sama
 * @param data.finalParams       parameter PPH_FINAL_UMKM aktif
 * @param data.ppnParams         parameter PPN aktif
 * @param data.year              tahun pajak yang dinilai
 */
function buildContext(business, { revenueTotal = 0, otherOwnRevenue = 0, finalParams, ppnParams, year }) {
  const p = finalParams;
  const estimate = toNumber(business.estimatedAnnualRevenue);
  const cumulativeRevenue = revenueTotal;
  const annualRevenue = Math.max(revenueTotal, estimate);

  const isFamilyType = ["OP", "PT_PERORANGAN"].includes(business.entityType);
  const spouseRevenue = business.spouse && business.spouse.hasBusiness ? toNumber(business.spouse.estimatedAnnualRevenue) : 0;
  const combinedRevenue = isFamilyType ? annualRevenue + otherOwnRevenue + spouseRevenue : annualRevenue;

  const facilityYearsUsed = business.facilityStartYear ? year - business.facilityStartYear + 1 : 0;
  const registered = business.registeredDate ? new Date(business.registeredDate) : null;
  const registeredBeforeCutoff = !registered || registered < new Date(p.transitionCutoff);
  // Koperasi: maksimal 4 tahun; koperasi yang terdaftar sebelum PP 20/2026 boleh sampai tahun pajak 2029 (ketentuan peralihan)
  const withinCooperativePeriod =
    business.entityType !== "KOPERASI" ||
    facilityYearsUsed <= p.cooperativeMaxYears ||
    (registeredBeforeCutoff && year <= (p.cooperativeTransitionEndYear || 0));

  // Badan yang sudah memakai PPh Final sebelum PP 20/2026 berlaku dan masa fasilitasnya belum habis
  let transitionActive = false;
  let transitionEndYear = null;
  if (BADAN_NON_FINAL.includes(business.entityType) && business.facilityStartYear) {
    const beforeCutoff = registeredBeforeCutoff;
    const maxYears = (p.transitionMaxYears || {})[business.entityType] || 0;
    transitionEndYear = business.facilityStartYear + maxYears - 1;
    transitionActive = beforeCutoff && year <= transitionEndYear;
  }

  const generalSchemeRequired = combinedRevenue > p.ceiling || !withinCooperativePeriod;
  const pph22Withheld = cumulativeRevenue > p.opExemption || business.entityType !== "OP";
  const pkpRevenue = business.sector === "kuliner" ? 0 : annualRevenue; // omzet kena PBJT tidak dihitung
  const mustBePKP = Boolean(business.isPKP) || pkpRevenue > ppnParams.pkpThreshold;

  // Peringatan 80%: untuk OP terhadap Rp500 juta, untuk semua terhadap Rp4,8 miliar
  const ratio = p.warningRatio || 0.8;
  let nearThreshold = false;
  let nearestLimit = null;
  let percentOfLimit = 0;
  if (business.entityType === "OP" && cumulativeRevenue >= ratio * p.opExemption && cumulativeRevenue <= p.opExemption) {
    nearThreshold = true;
    nearestLimit = p.opExemption;
    percentOfLimit = cumulativeRevenue / p.opExemption;
  } else if (combinedRevenue >= ratio * p.ceiling && combinedRevenue <= p.ceiling) {
    nearThreshold = true;
    nearestLimit = p.ceiling;
    percentOfLimit = combinedRevenue / p.ceiling;
  }

  return {
    entityType: business.entityType,
    sector: business.sector,
    salesChannels: business.salesChannels || [],
    hasEmployees: Boolean(business.hasEmployees),
    ownsBusinessProperty: Boolean(business.ownsBusinessProperty),
    hasNPWP: Boolean(business.hasNPWP),
    isPKP: Boolean(business.isPKP),
    marketplaceStatementSent: Boolean(business.marketplaceStatementSent),
    registeredDate: business.registeredDate || null,
    cumulativeRevenue,
    annualRevenue,
    combinedRevenue,
    facilityYearsUsed,
    withinCooperativePeriod,
    transitionActive,
    transitionEndYear,
    generalSchemeRequired,
    pph22Withheld,
    mustBePKP,
    nearThreshold,
    nearestLimit,
    percentOfLimit,
    ceiling: p.ceiling,
    opExemption: p.opExemption,
    finalRate: p.rate,
    city: (business.address && business.address.city) || "",
    year,
  };
}

// Nilai yang diawali "$" diambil dari konteks, misalnya "$ceiling"
function resolveValue(value, ctx) {
  if (typeof value === "string" && value.startsWith("$")) return ctx[value.slice(1)];
  return value;
}

function evaluateCondition({ field, operator, value }, ctx) {
  const actual = ctx[field];
  const expected = resolveValue(value, ctx);
  const list = Array.isArray(expected) ? expected : [expected];
  switch (operator) {
    case "eq": return actual === expected;
    case "ne": return actual !== expected;
    // Untuk field berbentuk daftar (salesChannels), "in" berarti ada isi yang sama
    case "in": return Array.isArray(actual) ? actual.some((a) => list.includes(a)) : list.includes(actual);
    case "nin": return Array.isArray(actual) ? !actual.some((a) => list.includes(a)) : !list.includes(actual);
    case "gt": return Number(actual) > Number(expected);
    case "gte": return Number(actual) >= Number(expected);
    case "lt": return Number(actual) < Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    case "before": return actual !== null && new Date(actual) < new Date(expected);
    case "after": return actual !== null && new Date(actual) > new Date(expected);
    default: return false;
  }
}

function evaluateRule(rule, ctx) {
  return (rule.conditions || []).every((condition) => evaluateCondition(condition, ctx));
}

// Variabel yang bisa dipakai di teks penjelasan advice_rules
function templateVariables(ctx) {
  return {
    omzetKumulatif: rupiah(ctx.cumulativeRevenue),
    omzetSetahun: rupiah(ctx.annualRevenue),
    omzetGabungan: rupiah(ctx.combinedRevenue),
    batasBebas: rupiah(ctx.opExemption),
    batasOmzet: rupiah(ctx.ceiling),
    tarifFinal: `${(ctx.finalRate * 100).toLocaleString("id-ID")}%`,
    persenBatas: `${Math.round(ctx.percentOfLimit * 100)}%`,
    batasTerdekat: ctx.nearestLimit ? rupiah(ctx.nearestLimit) : "-",
    tahunAkhirFasilitas: ctx.transitionEndYear || "-",
    kota: ctx.city || "setempat",
    tahun: ctx.year,
  };
}

function renderTemplate(text, ctx) {
  const vars = templateVariables(ctx);
  return String(text || "").replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

// Menjalankan semua aturan aktif dan mengembalikan aturan yang cocok, urut prioritas
function runRules(adviceRules, ctx) {
  return adviceRules
    .filter((rule) => rule.isActive !== false && evaluateRule(rule, ctx))
    .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10) || a.code.localeCompare(b.code))
    .map((rule) => ({ rule, reason: renderTemplate(rule.explanation, ctx) }));
}

// Apakah usaha boleh memakai kalkulator PPh Final? (dipakai kalkulator, 422 bila tidak)
function isEligibleForFinal(ctx) {
  const eligibleType = ["OP", "PT_PERORANGAN", "KOPERASI"].includes(ctx.entityType);
  return (
    ctx.sector !== "pekerjaan_bebas" &&
    ((eligibleType && ctx.combinedRevenue <= ctx.ceiling && ctx.withinCooperativePeriod) || ctx.transitionActive)
  );
}

module.exports = { CONTEXT_FIELDS, buildContext, evaluateCondition, evaluateRule, renderTemplate, runRules, isEligibleForFinal };
