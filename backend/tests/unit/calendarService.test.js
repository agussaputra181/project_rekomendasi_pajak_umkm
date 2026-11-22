 const { buildDeadlines, shiftToWorkday, toKey } = require("../../src/services/calendarService");
const { params, holidays } = require("../helpers");

test("TC-CALC-17: tanggal 15 jatuh pada Minggu -> bergeser ke Senin", () => {
  const sunday = new Date(Date.UTC(2026, 10, 15)); // 15 November 2026 = Minggu
  expect(sunday.getUTCDay()).toBe(0);
  expect(toKey(shiftToWorkday(sunday, holidays))).toBe("2026-11-16");
});

test("Jatuh tempo pada cuti bersama Idulfitri digeser ke hari kerja berikutnya", () => {
  expect(toKey(shiftToWorkday(new Date(Date.UTC(2026, 2, 20)), holidays))).toBe("2026-03-25");
});

test("OP: setor PPh Final hanya mulai bulan omzet melewati Rp500 juta", () => {
  const monthly = { 1: 100e6, 2: 100e6, 3: 100e6, 4: 100e6, 5: 80e6, 6: 100e6 };
  const events = buildDeadlines({ entityType: "OP" }, { year: 2026, monthlyRevenue: monthly, obligations: new Set(["PPH_FINAL"]), params, holidays });
  const finalMonths = events.filter((e) => e.taxType === "PPH_FINAL").map((e) => e.period.month);
  expect(finalMonths[0]).toBe(6); // kumulatif Juni 580 jt
  expect(finalMonths).not.toContain(5);
});

test("SPT Tahunan badan 30 April, orang pribadi 31 Maret tahun berikutnya", () => {
  const op = buildDeadlines({ entityType: "OP" }, { year: 2026, obligations: new Set(), params, holidays });
  const badan = buildDeadlines({ entityType: "CV" }, { year: 2026, obligations: new Set(), params, holidays });
  expect(toKey(op.find((e) => e.key === "SPT-TAHUNAN-2026").originalDate)).toBe("2027-03-31");
  expect(toKey(badan.find((e) => e.key === "SPT-TAHUNAN-2026").originalDate)).toBe("2027-04-30");
});
