// Uji akurasi perhitungan sesuai SRS Tabel 35 (TC-CALC).
const calc = require("../../src/services/taxCalculator");
const { params } = require("../helpers");

describe("PPh Final 0,5%", () => {
  test("TC-CALC-01: OP kumulatif Rp480 jt masih di bawah Rp500 jt -> Rp0", () => {
    const r = calc.calcPphFinal({ monthRevenue: 100e6, cumulativeBefore: 380e6, isOP: true }, params.final);
    expect(r.taxDue).toBe(0);
  });
  test("TC-CALC-02: OP melewati batas di tengah bulan -> bagian bebas Rp20 jt, PPh Rp400.000", () => {
    const r = calc.calcPphFinal({ monthRevenue: 100e6, cumulativeBefore: 480e6, isOP: true }, params.final);
    expect(r.deduction).toBe(20e6);
    expect(r.dpp).toBe(80e6);
    expect(r.taxDue).toBe(400000);
  });
  test("TC-CALC-03: PPh 22 marketplace mengurangi setoran -> sisa Rp350.000", () => {
    const r = calc.calcPphFinal({ monthRevenue: 100e6, cumulativeBefore: 600e6, isOP: true, pph22Collected: 150000 }, params.final);
    expect(r.taxDue).toBe(500000);
    expect(r.payable).toBe(350000);
  });
  test("TC-CALC-04: PT Perorangan tanpa bagian bebas -> Rp500.000", () => {
    const r = calc.calcPphFinal({ monthRevenue: 100e6, cumulativeBefore: 0, isOP: false }, params.final);
    expect(r.taxDue).toBe(500000);
  });
});

describe("PPh Badan Pasal 31E", () => {
  test("TC-CALC-06: omzet Rp2 M, PKP Rp200 jt -> Rp22.000.000", () => {
    expect(calc.calcPphBadan({ annualRevenue: 2e9, pkp: 200e6 }, params.badan).taxDue).toBe(22000000);
  });
  test("TC-CALC-07: omzet Rp9,6 M, PKP Rp1,2 M -> Rp198.000.000", () => {
    const r = calc.calcPphBadan({ annualRevenue: 9.6e9, pkp: 1.2e9 }, params.badan);
    expect(r.facilityPkp).toBe(600e6);
    expect(r.taxDue).toBe(198000000);
  });
  test("TC-CALC-08: omzet Rp60 M tanpa fasilitas -> Rp1.100.000.000", () => {
    expect(calc.calcPphBadan({ annualRevenue: 60e9, pkp: 5e9 }, params.badan).taxDue).toBe(1100000000);
  });
});

describe("PPh 21", () => {
  const employee = { name: "Rina", ptkpStatus: "TK/0", employmentType: "tetap", pensionContribution: 0 };
  test("TC-CALC-09: TK/0 bruto Rp5 jt -> TER A 0% -> Rp0", () => {
    const r = calc.calcPph21Monthly({ ...employee, monthlyGross: 5e6 }, params.ter);
    expect(r.category).toBe("A");
    expect(r.tax).toBe(0);
  });
  test("TC-CALC-10: TK/0 bruto Rp10 jt -> TER A 2% -> Rp200.000", () => {
    const r = calc.calcPph21Monthly({ ...employee, monthlyGross: 10e6 }, params.ter);
    expect(r.rate).toBe(0.02);
    expect(r.tax).toBe(200000);
  });
  test("TC-CALC-11: Desember TK/0 Rp10 jt x 12 -> Rp800.000", () => {
    const r = calc.calcPph21December({ ...employee, monthlyGross: 10e6 }, params);
    expect(r.tax).toBe(800000);
  });
  test("Kategori TER C (K/3) dengan batas 10,95 jt = 1,5%", () => {
    expect(calc.findTerRate("C", 10950000, params.ter)).toBe(0.015);
  });
  test("PTKP K/3 = Rp72.000.000", () => {
    expect(calc.calcPtkp("K/3", params.ptkp)).toBe(72000000);
  });
});

describe("PPN dan perbandingan skema", () => {
  test("TC-CALC-13: penjualan Rp100 jt, PPN masukan Rp6,6 jt -> setor Rp4.400.000", () => {
    const r = calc.calcPpn({ sales: 100e6, inputVat: 6.6e6 }, params.ppn);
    expect(r.dpp).toBe(91666667);
    expect(r.taxDue).toBe(11000000);
    expect(r.payable).toBe(4400000);
  });
  test("Perbandingan skema OP menampilkan dua hasil", () => {
    const r = calc.compareSchemes({ entityType: "OP", annualRevenue: 900e6, netIncome: 120e6 }, params);
    expect(r.final.tax).toBe(2000000);
    expect(r.general.tax).toBeGreaterThan(0);
  });
});
