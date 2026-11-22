// Uji regresi sebelum versi aturan tarif diaktifkan (SRS FR-017, TC-API-15).
// Setiap jenis pajak punya kasus acuan dari SRS Tabel 35. Jika parameter baru membuat hasil berbeda,
// aktivasi ditolak (422). Bila peraturan memang berubah, pengembang memperbarui kasus acuan di file ini.
const calc = require("./taxCalculator");
const { DEFAULT_TAX_RULES } = require("../constants/defaultTaxRules");

const defaults = Object.fromEntries(DEFAULT_TAX_RULES.map((r) => [r.taxType, r.parameters]));
const isRate = (v) => typeof v === "number" && v >= 0 && v < 1;
const isMoney = (v) => typeof v === "number" && v >= 0;

// Pemeriksaan struktur parameter wajib
const REQUIRED = {
  PPH_FINAL_UMKM: { rate: isRate, ceiling: isMoney, opExemption: isMoney, cooperativeMaxYears: isMoney },
  PPH_BADAN: { rate: isRate, facilityRate: isRate, facilityRevenueLimit: isMoney, facilityMaxRevenue: isMoney },
  PPH21_TER: { tables: (v) => v && ["A", "B", "C"].every((k) => Array.isArray(v[k]) && v[k].length > 0), categoryMap: (v) => v && typeof v === "object" },
  PPH21_PASAL17: { brackets: (v) => Array.isArray(v) && v.length > 0, jobExpenseRate: isRate, jobExpenseMaxYear: isMoney },
  PTKP: { base: isMoney, married: isMoney, perDependent: isMoney, maxDependents: isMoney },
  PPN: { rate: isRate, dppNumerator: isMoney, dppDenominator: (v) => typeof v === "number" && v > 0, pkpThreshold: isMoney },
  PPH22_PMSE: { rate: isRate },
  PPH22_PEMERINTAH: { rate: isRate },
  PBJT: { maxRate: isRate },
  HARI_LIBUR: { dates: (v) => Array.isArray(v) && v.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) },
};

// Kasus acuan: fungsi menerima parameter kandidat (digabung dengan default untuk jenis lain)
const CASES = {
  PPH_FINAL_UMKM: [
    { id: "TC-CALC-01", run: (p) => calc.calcPphFinal({ monthRevenue: 100e6, cumulativeBefore: 380e6, isOP: true }, p).taxDue, expected: 0 },
    { id: "TC-CALC-02", run: (p) => calc.calcPphFinal({ monthRevenue: 100e6, cumulativeBefore: 480e6, isOP: true }, p).taxDue, expected: 400000 },
    { id: "TC-CALC-03", run: (p) => calc.calcPphFinal({ monthRevenue: 100e6, cumulativeBefore: 600e6, isOP: true, pph22Collected: 150000 }, p).payable, expected: 350000 },
    { id: "TC-CALC-04", run: (p) => calc.calcPphFinal({ monthRevenue: 100e6, cumulativeBefore: 0, isOP: false }, p).taxDue, expected: 500000 },
  ],
  PPH_BADAN: [
    { id: "TC-CALC-06", run: (p) => calc.calcPphBadan({ annualRevenue: 2e9, pkp: 200e6 }, p).taxDue, expected: 22000000 },
    { id: "TC-CALC-07", run: (p) => calc.calcPphBadan({ annualRevenue: 9.6e9, pkp: 1.2e9 }, p).taxDue, expected: 198000000 },
    { id: "TC-CALC-08", run: (p) => calc.calcPphBadan({ annualRevenue: 60e9, pkp: 5e9 }, p).taxDue, expected: 1100000000 },
  ],
  PPH21_TER: [
    { id: "TC-CALC-09", run: (p) => calc.calcPph21Monthly({ name: "A", ptkpStatus: "TK/0", monthlyGross: 5e6 }, p).tax, expected: 0 },
    { id: "TC-CALC-10", run: (p) => calc.calcPph21Monthly({ name: "A", ptkpStatus: "TK/0", monthlyGross: 10e6 }, p).tax, expected: 200000 },
  ],
  PPH21_PASAL17: [
    {
      id: "TC-CALC-11",
      run: (p) => calc.calcPph21December({ name: "A", ptkpStatus: "TK/0", monthlyGross: 10e6, pensionContribution: 0 }, { ter: defaults.PPH21_TER, pasal17: p, ptkp: defaults.PTKP }).tax,
      expected: 800000,
    },
  ],
  PTKP: [
    {
      id: "TC-CALC-11",
      run: (p) => calc.calcPph21December({ name: "A", ptkpStatus: "TK/0", monthlyGross: 10e6, pensionContribution: 0 }, { ter: defaults.PPH21_TER, pasal17: defaults.PPH21_PASAL17, ptkp: p }).tax,
      expected: 800000,
    },
  ],
  PPN: [{ id: "TC-CALC-13", run: (p) => calc.calcPpn({ sales: 100e6, inputVat: 6.6e6 }, p).payable, expected: 4400000 }],
};

function runRegression(taxType, parameters) {
  const results = [];
  for (const [key, check] of Object.entries(REQUIRED[taxType] || {})) {
    const passed = Boolean(check(parameters ? parameters[key] : undefined));
    results.push({ id: `PARAM-${key}`, description: `Parameter "${key}" terisi dengan benar`, expected: "valid", actual: passed ? "valid" : "tidak valid", passed });
  }
  if (results.every((r) => r.passed)) {
    for (const testCase of CASES[taxType] || []) {
      let actual;
      try {
        actual = testCase.run(parameters);
      } catch (error) {
        actual = `error: ${error.message}`;
      }
      results.push({ id: testCase.id, description: `Kasus acuan ${testCase.id}`, expected: testCase.expected, actual, passed: actual === testCase.expected });
    }
  }
  return { passed: results.every((r) => r.passed), results };
}

module.exports = { runRegression };
