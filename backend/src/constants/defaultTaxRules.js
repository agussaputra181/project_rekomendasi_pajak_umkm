// NILAI AWAL collection "tax_rules" (dimasukkan ke database oleh seed).
// Setelah ada di database, sistem SELALU membaca versi aktif dari database (lihat services/ruleService.js),
// sehingga Admin bisa memperbarui tarif tanpa mengubah kode (NFR Configurability).

// Lapisan TER bulanan PP 58/2023: [batas atas penghasilan bruto, tarif]. null = tanpa batas atas.
const TER_A = [
  [5400000, 0], [5650000, 0.0025], [5950000, 0.005], [6300000, 0.0075], [6750000, 0.01], [7500000, 0.0125],
  [8550000, 0.015], [9650000, 0.0175], [10050000, 0.02], [10350000, 0.0225], [10700000, 0.025], [11050000, 0.03],
  [11600000, 0.035], [12500000, 0.04], [13750000, 0.05], [15100000, 0.06], [16950000, 0.07], [19750000, 0.08],
  [24150000, 0.09], [26450000, 0.1], [28000000, 0.11], [30050000, 0.12], [32400000, 0.13], [35400000, 0.14],
  [39100000, 0.15], [43850000, 0.16], [47800000, 0.17], [51400000, 0.18], [56300000, 0.19], [62200000, 0.2],
  [68600000, 0.21], [77500000, 0.22], [89000000, 0.23], [103000000, 0.24], [125000000, 0.25], [157000000, 0.26],
  [206000000, 0.27], [337000000, 0.28], [454000000, 0.29], [550000000, 0.3], [695000000, 0.31], [910000000, 0.32],
  [1400000000, 0.33], [null, 0.34],
];
const TER_B = [
  [6200000, 0], [6500000, 0.0025], [6850000, 0.005], [7300000, 0.0075], [9200000, 0.01], [10750000, 0.015],
  [11250000, 0.02], [11600000, 0.025], [12600000, 0.03], [13600000, 0.04], [14950000, 0.05], [16400000, 0.06],
  [18450000, 0.07], [21850000, 0.08], [26000000, 0.09], [27700000, 0.1], [29350000, 0.11], [31450000, 0.12],
  [33950000, 0.13], [37100000, 0.14], [41100000, 0.15], [45800000, 0.16], [49500000, 0.17], [53800000, 0.18],
  [58500000, 0.19], [64000000, 0.2], [71000000, 0.21], [80000000, 0.22], [93000000, 0.23], [109000000, 0.24],
  [129000000, 0.25], [163000000, 0.26], [211000000, 0.27], [374000000, 0.28], [459000000, 0.29], [555000000, 0.3],
  [704000000, 0.31], [957000000, 0.32], [1405000000, 0.33], [null, 0.34],
];
const TER_C = [
  [6600000, 0], [6950000, 0.0025], [7350000, 0.005], [7800000, 0.0075], [8850000, 0.01], [9800000, 0.0125],
  [10950000, 0.015], [11200000, 0.0175], [12050000, 0.02], [12950000, 0.03], [14150000, 0.04], [15550000, 0.05],
  [17050000, 0.06], [19500000, 0.07], [22700000, 0.08], [26600000, 0.09], [28100000, 0.1], [30100000, 0.11],
  [32600000, 0.12], [35400000, 0.13], [38900000, 0.14], [43000000, 0.15], [47400000, 0.16], [51200000, 0.17],
  [55800000, 0.18], [60400000, 0.19], [66700000, 0.2], [74500000, 0.21], [83200000, 0.22], [95600000, 0.23],
  [110000000, 0.24], [134000000, 0.25], [169000000, 0.26], [221000000, 0.27], [390000000, 0.28], [463000000, 0.29],
  [561000000, 0.3], [709000000, 0.31], [965000000, 0.32], [1419000000, 0.33], [null, 0.34],
];

const toBrackets = (rows) => rows.map(([upTo, rate]) => ({ upTo, rate }));

const DEFAULT_TAX_RULES = [
  {
    taxType: "PPH_FINAL_UMKM",
    base: "Omzet bruto bulanan",
    mechanism: "setor_sendiri",
    regulationNumber: "PP 20/2026",
    parameters: {
      rate: 0.005, // 0,5%
      ceiling: 4800000000, // batas omzet setahun Rp4,8 miliar
      opExemption: 500000000, // bagian omzet tidak kena pajak untuk orang pribadi
      eligibleEntities: ["OP", "PT_PERORANGAN", "KOPERASI"],
      cooperativeMaxYears: 4, // koperasi maksimal 4 tahun pajak sejak terdaftar
      cooperativeTransitionEndYear: 2029, // koperasi terdaftar sebelum PP 20/2026: boleh s.d. tahun pajak 2029
      transitionCutoff: "2026-04-22", // badan yang terdaftar sebelum tanggal ini masih masa transisi
      transitionMaxYears: { CV: 4, FIRMA: 4, BUMDES: 4, PT: 3 }, // jangka waktu fasilitas PP 55/2022
      warningRatio: 0.8, // peringatan saat omzet mencapai 80% batas
    },
    dueRule: { payDay: 15, reportDay: null, payEndOfNextMonth: false, annualDeadline: "31-03" },
  },
  {
    taxType: "PPH_BADAN",
    base: "Penghasilan Kena Pajak (laba fiskal)",
    mechanism: "setor_sendiri",
    regulationNumber: "UU 7/2021",
    parameters: { rate: 0.22, facilityRate: 0.11, facilityRevenueLimit: 4800000000, facilityMaxRevenue: 50000000000 },
    dueRule: { payDay: 15, reportDay: 20, payEndOfNextMonth: false, annualDeadline: "30-04" },
  },
  {
    taxType: "PPH21_TER",
    base: "Penghasilan bruto bulanan",
    mechanism: "dipotong",
    regulationNumber: "PP 58/2023",
    parameters: {
      categoryMap: { "TK/0": "A", "TK/1": "A", "K/0": "A", "TK/2": "B", "TK/3": "B", "K/1": "B", "K/2": "B", "K/3": "C" },
      tables: { A: toBrackets(TER_A), B: toBrackets(TER_B), C: toBrackets(TER_C) },
    },
    dueRule: { payDay: 15, reportDay: 20, payEndOfNextMonth: false, annualDeadline: null },
  },
  {
    taxType: "PPH21_PASAL17",
    base: "Penghasilan Kena Pajak setahun",
    mechanism: "dipotong",
    regulationNumber: "UU 7/2021",
    parameters: {
      brackets: [
        { upTo: 60000000, rate: 0.05 },
        { upTo: 250000000, rate: 0.15 },
        { upTo: 500000000, rate: 0.25 },
        { upTo: 5000000000, rate: 0.3 },
        { upTo: null, rate: 0.35 },
      ],
      jobExpenseRate: 0.05, // biaya jabatan 5%
      jobExpenseMaxYear: 6000000, // maksimal Rp6 juta setahun
    },
    dueRule: { payDay: 15, reportDay: 20, payEndOfNextMonth: false, annualDeadline: "31-03" },
  },
  {
    taxType: "PTKP",
    base: "Penghasilan Tidak Kena Pajak setahun",
    mechanism: "dipotong",
    regulationNumber: "PMK 101/2016",
    parameters: { base: 54000000, married: 4500000, perDependent: 4500000, maxDependents: 3 },
    dueRule: {},
  },
  {
    taxType: "PPN",
    base: "DPP nilai lain 11/12 x harga jual",
    mechanism: "dipungut",
    regulationNumber: "PMK 131/2024",
    parameters: { rate: 0.12, dppNumerator: 11, dppDenominator: 12, pkpThreshold: 4800000000 },
    dueRule: { payDay: null, reportDay: null, payEndOfNextMonth: true, annualDeadline: null },
  },
  {
    taxType: "PPH22_PMSE",
    base: "Omzet penjualan di marketplace",
    mechanism: "dipungut",
    regulationNumber: "PMK 37/2025",
    parameters: { rate: 0.005, statementThreshold: 500000000 },
    dueRule: {},
  },
  {
    taxType: "PPH22_PEMERINTAH",
    base: "Nilai pembelian oleh bendahara pemerintah",
    mechanism: "dipungut",
    regulationNumber: "UU 7/2021",
    parameters: { rate: 0.015 },
    dueRule: {},
  },
  {
    taxType: "PBJT",
    base: "Penjualan makanan & minuman",
    mechanism: "dipungut",
    regulationNumber: "UU 1/2022",
    parameters: { maxRate: 0.1 },
    dueRule: {},
  },
  {
    taxType: "HARI_LIBUR",
    base: "Hari libur nasional & cuti bersama (SKB 3 Menteri)",
    mechanism: "setor_sendiri",
    regulationNumber: null,
    parameters: {
      dates: [
        // 2026 (SKB 1497/2025, 2/2025, 5/2025)
        "2026-01-01", "2026-01-16", "2026-02-16", "2026-02-17", "2026-03-18", "2026-03-19", "2026-03-20",
        "2026-03-21", "2026-03-22", "2026-03-23", "2026-03-24", "2026-04-03", "2026-04-05", "2026-05-01",
        "2026-05-14", "2026-05-15", "2026-05-27", "2026-05-28", "2026-05-31", "2026-06-01", "2026-06-16",
        "2026-08-17", "2026-08-25", "2026-12-24", "2026-12-25",
        // 2027 (SKB 1205/2026, 3/2026, 2/2026)
        "2027-01-01", "2027-01-05", "2027-02-05", "2027-02-06", "2027-03-08", "2027-03-09", "2027-03-10",
        "2027-03-11", "2027-03-12", "2027-03-15", "2027-03-25", "2027-03-26", "2027-03-28", "2027-05-01",
        "2027-05-06", "2027-05-17", "2027-05-18", "2027-05-19", "2027-05-20", "2027-06-01", "2027-06-06",
        "2027-08-15", "2027-08-17", "2027-12-24", "2027-12-25", "2027-12-26",
      ],
    },
    dueRule: {},
  },
];

module.exports = { DEFAULT_TAX_RULES };
