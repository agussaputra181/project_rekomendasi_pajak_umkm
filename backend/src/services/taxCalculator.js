// Fungsi perhitungan pajak (SRS Tabel 30). Semua fungsi "murni": hanya menerima angka & parameter,
// tidak membaca database, sehingga mudah diuji (tests/unit/taxCalculator.test.js).
// Pola umum: Pajak terutang = (DPP - pengurang) x tarif - kredit pajak. Hasil akhir dibulatkan ke bawah.
const { floorRupiah, rupiah } = require("../utils/money");

const pct = (rate) => `${(rate * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;

// ---------- PPh Final 0,5% (bulanan) ----------
// input: { monthRevenue, cumulativeBefore, isOP, pph22Collected }
// p: parameter PPH_FINAL_UMKM { rate, opExemption }
function calcPphFinal({ monthRevenue, cumulativeBefore = 0, isOP, pph22Collected = 0 }, p) {
  const deduction = isOP ? Math.max(0, p.opExemption - cumulativeBefore) : 0; // bagian bebas (hanya OP)
  const dpp = Math.max(0, monthRevenue - deduction);
  const taxDue = floorRupiah(dpp * p.rate);
  const credit = floorRupiah(pph22Collected);
  const payable = Math.max(0, taxDue - credit);
  const steps = [
    `Omzet bulan ini = ${rupiah(monthRevenue)}`,
    isOP
      ? `Bagian bebas = maks(0, ${rupiah(p.opExemption)} - omzet sebelumnya ${rupiah(cumulativeBefore)}) = ${rupiah(deduction)}`
      : "Bukan orang pribadi, tidak ada bagian omzet yang bebas pajak",
    `DPP = maks(0, ${rupiah(monthRevenue)} - ${rupiah(deduction)}) = ${rupiah(dpp)}`,
    `PPh terutang = ${pct(p.rate)} x ${rupiah(dpp)} = ${rupiah(taxDue)}`,
    `Sisa setor = maks(0, ${rupiah(taxDue)} - PPh 22 dipungut ${rupiah(credit)}) = ${rupiah(payable)}`,
  ];
  return { dpp, deduction, rate: p.rate, taxDue, credit, payable, steps };
}

// ---------- PPh Badan dengan Pasal 31E (tahunan) ----------
// input: { annualRevenue, pkp, credits }  p: PPH_BADAN { rate, facilityRate, facilityRevenueLimit, facilityMaxRevenue }
function calcPphBadan({ annualRevenue, pkp, credits = 0 }, p) {
  let facilityPkp = 0;
  const steps = [`Omzet setahun = ${rupiah(annualRevenue)}`, `Penghasilan Kena Pajak (PKP) = ${rupiah(pkp)}`];
  if (annualRevenue <= p.facilityRevenueLimit) {
    facilityPkp = pkp;
    steps.push(`Omzet tidak lebih dari ${rupiah(p.facilityRevenueLimit)}: seluruh PKP mendapat tarif ${pct(p.facilityRate)}`);
  } else if (annualRevenue <= p.facilityMaxRevenue) {
    facilityPkp = floorRupiah((p.facilityRevenueLimit / annualRevenue) * pkp);
    steps.push(`PKP fasilitas = (${rupiah(p.facilityRevenueLimit)} / ${rupiah(annualRevenue)}) x ${rupiah(pkp)} = ${rupiah(facilityPkp)}`);
  } else {
    steps.push(`Omzet di atas ${rupiah(p.facilityMaxRevenue)}: tidak ada fasilitas Pasal 31E`);
  }
  const normalPkp = pkp - facilityPkp;
  const taxFacility = floorRupiah(facilityPkp * p.facilityRate);
  const taxNormal = floorRupiah(normalPkp * p.rate);
  const taxDue = taxFacility + taxNormal;
  if (facilityPkp > 0) steps.push(`${pct(p.facilityRate)} x ${rupiah(facilityPkp)} = ${rupiah(taxFacility)}`);
  if (normalPkp > 0) steps.push(`${pct(p.rate)} x ${rupiah(normalPkp)} = ${rupiah(taxNormal)}`);
  steps.push(`PPh Badan terutang = ${rupiah(taxDue)}`);
  const credit = floorRupiah(credits);
  const payable = taxDue - credit; // negatif = lebih bayar
  steps.push(`Kurang (lebih) bayar = ${rupiah(taxDue)} - kredit pajak ${rupiah(credit)} = ${payable < 0 ? "-" : ""}${rupiah(Math.abs(payable))}`);
  return { dpp: pkp, deduction: 0, facilityPkp, rate: p.rate, taxDue, credit, payable, steps };
}

// ---------- PPh 21 ----------
// Mencari tarif TER dari tabel lapisan [{ upTo, rate }]
function findTerRate(category, monthlyGross, terParams) {
  const table = terParams.tables[category];
  const row = table.find((r) => r.upTo === null || monthlyGross <= r.upTo);
  return row.rate;
}

function calcPtkp(status, p) {
  const [marital, dependents] = status.split("/");
  const count = Math.min(Number(dependents) || 0, p.maxDependents);
  return p.base + (marital === "K" ? p.married : 0) + count * p.perDependent;
}

// Tarif progresif Pasal 17 untuk PKP setahun
function calcPasal17(pkp, brackets) {
  let remaining = pkp;
  let lower = 0;
  let tax = 0;
  const steps = [];
  for (const { upTo, rate } of brackets) {
    if (remaining <= 0) break;
    const width = upTo === null ? remaining : Math.min(remaining, upTo - lower);
    const part = width * rate;
    steps.push(`${pct(rate)} x ${rupiah(width)} = ${rupiah(part)}`);
    tax += part;
    remaining -= width;
    lower = upTo === null ? lower : upTo;
  }
  return { tax: floorRupiah(tax), steps };
}

// PPh 21 Januari-November (dan pegawai tidak tetap): TER x bruto bulanan
function calcPph21Monthly(employee, terParams) {
  const category = terParams.categoryMap[employee.ptkpStatus] || "A";
  const rate = findTerRate(category, employee.monthlyGross, terParams);
  const tax = floorRupiah(employee.monthlyGross * rate);
  return {
    name: employee.name,
    category,
    rate,
    tax,
    steps: [`${rupiah(employee.monthlyGross)} x TER ${category} ${pct(rate)} = ${rupiah(tax)}`],
  };
}

// PPh 21 Desember pegawai tetap: hitung setahun dengan Pasal 17, dikurangi PPh Jan-Nov
function calcPph21December(employee, { ter, pasal17, ptkp }) {
  const monthly = calcPph21Monthly(employee, ter);
  const grossYear = employee.monthlyGross * 12;
  const jobExpense = Math.min(grossYear * pasal17.jobExpenseRate, pasal17.jobExpenseMaxYear);
  const pensionYear = (employee.pensionContribution || 0) * 12;
  const net = grossYear - jobExpense - pensionYear;
  const ptkpValue = calcPtkp(employee.ptkpStatus, ptkp);
  const pkp = Math.max(0, Math.floor((net - ptkpValue) / 1000) * 1000); // dibulatkan ke bawah ribuan
  const annual = calcPasal17(pkp, pasal17.brackets);
  const paidJanNov = monthly.tax * 11;
  const tax = annual.tax - paidJanNov; // negatif = lebih potong, dikembalikan ke pegawai
  return {
    name: employee.name,
    category: monthly.category,
    rate: null,
    tax,
    steps: [
      `Bruto setahun = 12 x ${rupiah(employee.monthlyGross)} = ${rupiah(grossYear)}`,
      `Biaya jabatan = ${pct(pasal17.jobExpenseRate)}, maks. ${rupiah(pasal17.jobExpenseMaxYear)} = ${rupiah(jobExpense)}`,
      `Iuran pensiun/JHT setahun = ${rupiah(pensionYear)}`,
      `Neto setahun = ${rupiah(net)}`,
      `PTKP ${employee.ptkpStatus} = ${rupiah(ptkpValue)}`,
      `PKP (dibulatkan ke bawah ribuan) = ${rupiah(pkp)}`,
      ...annual.steps,
      `PPh setahun = ${rupiah(annual.tax)}`,
      `PPh Jan-Nov = 11 x ${rupiah(monthly.tax)} = ${rupiah(paidJanNov)}`,
      `PPh Desember = ${rupiah(annual.tax)} - ${rupiah(paidJanNov)} = ${tax < 0 ? "-" : ""}${rupiah(Math.abs(tax))}${tax < 0 ? " (lebih potong, dikembalikan)" : ""}`,
    ],
  };
}

// Semua karyawan aktif pada satu bulan
function calcPph21({ employees, month }, params) {
  const rows = employees.map((e) =>
    month === 12 && e.employmentType === "tetap" ? calcPph21December(e, params) : calcPph21Monthly(e, params.ter)
  );
  const taxDue = rows.reduce((sum, r) => sum + r.tax, 0);
  const dpp = employees.reduce((sum, e) => sum + e.monthlyGross, 0);
  const steps = rows.map((r) => `${r.name}: ${r.steps[r.steps.length - 1]}`);
  steps.push(`Total PPh 21 bulan ini = ${rupiah(Math.max(0, taxDue))}`);
  return { dpp, deduction: 0, rate: null, taxDue, credit: 0, payable: Math.max(0, taxDue), rows, steps };
}

// ---------- PPN sederhana ----------
// input: { sales, isLuxury, inputVat }  p: PPN { rate, dppNumerator, dppDenominator }
function calcPpn({ sales, isLuxury = false, inputVat = 0 }, p) {
  const dpp = isLuxury ? sales : Math.round((sales * p.dppNumerator) / p.dppDenominator);
  const taxDue = floorRupiah(dpp * p.rate);
  const credit = floorRupiah(inputVat);
  const payable = taxDue - credit; // negatif = lebih bayar
  return {
    dpp,
    deduction: 0,
    rate: p.rate,
    taxDue,
    credit,
    payable,
    steps: [
      isLuxury
        ? `Barang mewah: DPP = harga jual = ${rupiah(dpp)}`
        : `DPP = ${p.dppNumerator}/${p.dppDenominator} x ${rupiah(sales)} = ${rupiah(dpp)}`,
      `PPN keluaran = ${pct(p.rate)} x ${rupiah(dpp)} = ${rupiah(taxDue)}`,
      `PPN disetor = ${rupiah(taxDue)} - PPN masukan ${rupiah(credit)} = ${payable < 0 ? "-" : ""}${rupiah(Math.abs(payable))}`,
    ],
  };
}

// ---------- Perbandingan skema (simulasi setahun) ----------
// input: { entityType, annualRevenue, netIncome, ptkpStatus }
function compareSchemes({ entityType, annualRevenue, netIncome, ptkpStatus = "TK/0" }, params) {
  const fp = params.final;
  const isOP = entityType === "OP";
  const finalBase = isOP ? Math.max(0, annualRevenue - fp.opExemption) : annualRevenue;
  const finalTax = floorRupiah(finalBase * fp.rate);
  const finalSteps = [
    isOP ? `Omzet kena pajak = ${rupiah(annualRevenue)} - ${rupiah(fp.opExemption)} = ${rupiah(finalBase)}` : `Omzet kena pajak = ${rupiah(finalBase)}`,
    `PPh Final = ${pct(fp.rate)} x ${rupiah(finalBase)} = ${rupiah(finalTax)}`,
  ];

  let generalTax;
  let generalSteps;
  if (isOP) {
    const ptkpValue = calcPtkp(ptkpStatus, params.ptkp);
    const pkp = Math.max(0, Math.floor((netIncome - ptkpValue) / 1000) * 1000);
    const p17 = calcPasal17(pkp, params.pasal17.brackets);
    generalTax = p17.tax;
    generalSteps = [`Penghasilan neto = ${rupiah(netIncome)}`, `PTKP ${ptkpStatus} = ${rupiah(ptkpValue)}`, `PKP = ${rupiah(pkp)}`, ...p17.steps, `PPh Pasal 17 = ${rupiah(generalTax)}`];
  } else {
    const badan = calcPphBadan({ annualRevenue, pkp: netIncome }, params.badan);
    generalTax = badan.taxDue;
    generalSteps = badan.steps.slice(0, -1);
  }
  const cheaper = finalTax <= generalTax ? "final" : "umum";
  return {
    dpp: annualRevenue,
    deduction: 0,
    rate: fp.rate,
    taxDue: Math.min(finalTax, generalTax),
    credit: 0,
    payable: Math.min(finalTax, generalTax),
    final: { tax: finalTax, steps: finalSteps },
    general: { tax: generalTax, steps: generalSteps },
    difference: Math.abs(finalTax - generalTax),
    cheaper,
    steps: [
      `Skema PPh Final: ${rupiah(finalTax)}`,
      `Skema umum: ${rupiah(generalTax)}`,
      `Selisih ${rupiah(Math.abs(finalTax - generalTax))}; skema ${cheaper === "final" ? "PPh Final" : "umum"} lebih ringan (simulasi)`,
    ],
  };
}

module.exports = {
  calcPphFinal, calcPphBadan, findTerRate, calcPtkp, calcPasal17,
  calcPph21Monthly, calcPph21December, calcPph21, calcPpn, compareSchemes,
};
