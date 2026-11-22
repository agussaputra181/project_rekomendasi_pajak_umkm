// Uji rule engine (SRS Tabel 29 & 35) tanpa database.
const { buildContext, runRules, isEligibleForFinal, evaluateCondition } = require("../../src/services/ruleEngine");
const { params, adviceRules } = require("../helpers");

function codesFor(business, { revenueTotal = 0, otherOwnRevenue = 0, year = 2026 } = {}) {
  const ctx = buildContext({ salesChannels: [], hasNPWP: true, ...business }, { revenueTotal, otherOwnRevenue, finalParams: params.final, ppnParams: params.ppn, year });
  return { ctx, codes: runRules(adviceRules, ctx).map((m) => m.rule.code) };
}

test("TC-CALC-01: OP kumulatif Rp480 jt -> R-01 dan R-02 (belum terutang)", () => {
  const { codes } = codesFor({ entityType: "OP", sector: "dagang" }, { revenueTotal: 480e6 });
  expect(codes).toEqual(expect.arrayContaining(["R-01", "R-02"]));
});

test("TC-CALC-05: OP pekerjaan bebas -> R-06, tidak eligible PPh Final", () => {
  const { ctx, codes } = codesFor({ entityType: "OP", sector: "pekerjaan_bebas" }, { revenueTotal: 300e6 });
  expect(codes).toContain("R-06");
  expect(codes).not.toContain("R-01");
  expect(isEligibleForFinal(ctx)).toBe(false);
});

test("TC-CALC-06: CV terdaftar 10-06-2026 -> R-03", () => {
  const { codes } = codesFor({ entityType: "CV", sector: "dagang", registeredDate: new Date("2026-06-10") }, { revenueTotal: 2e9 });
  expect(codes).toContain("R-03");
  expect(codes).not.toContain("R-04");
});

test("CV yang memakai PPh Final sejak 2023 masih masa transisi -> R-04", () => {
  const { codes } = codesFor({ entityType: "CV", sector: "dagang", registeredDate: new Date("2023-01-10"), facilityStartYear: 2023 }, { revenueTotal: 1e9 });
  expect(codes).toContain("R-04");
});

test("TC-CALC-12: suami Rp3 M + istri Rp2 M -> R-05, tidak eligible", () => {
  const { ctx, codes } = codesFor(
    { entityType: "OP", sector: "dagang", estimatedAnnualRevenue: 3e9, spouse: { hasBusiness: true, estimatedAnnualRevenue: 2e9 } },
    { revenueTotal: 0 }
  );
  expect(ctx.combinedRevenue).toBe(5e9);
  expect(codes).toContain("R-05");
  expect(isEligibleForFinal(ctx)).toBe(false);
});

test("TC-CALC-14: OP omzet kumulatif Rp410 jt -> R-15 (82%)", () => {
  const { ctx, codes } = codesFor({ entityType: "OP", sector: "dagang" }, { revenueTotal: 410e6 });
  expect(codes).toContain("R-15");
  expect(Math.round(ctx.percentOfLimit * 100)).toBe(82);
});

test("TC-CALC-15: OP marketplace Rp300 jt, pernyataan belum dikirim -> R-08", () => {
  const { codes } = codesFor({ entityType: "OP", sector: "dagang", salesChannels: ["marketplace"], marketplaceStatementSent: false }, { revenueTotal: 300e6 });
  expect(codes).toContain("R-08");
  expect(codes).not.toContain("R-09");
});

test("TC-CALC-16: koperasi mulai 2021 -> masih boleh sampai 2029 (peralihan PP 20/2026), skema umum pada 2030 (R-05)", () => {
  const koperasi = { entityType: "KOPERASI", sector: "dagang", facilityStartYear: 2021, registeredDate: new Date("2021-01-05") };
  expect(codesFor(koperasi, { revenueTotal: 1e9, year: 2026 }).codes).toContain("R-01");
  const in2030 = codesFor(koperasi, { revenueTotal: 1e9, year: 2030 });
  expect(in2030.codes).toContain("R-05");
  expect(in2030.codes).not.toContain("R-01");
});

test("R-11 PKP: omzet > Rp4,8 M (bukan kuliner) atau sudah PKP", () => {
  expect(codesFor({ entityType: "PT", sector: "dagang" }, { revenueTotal: 6e9 }).codes).toContain("R-11");
  expect(codesFor({ entityType: "OP", sector: "jasa", isPKP: true }, { revenueTotal: 10e6 }).codes).toContain("R-11");
});

test("Operator kondisi: in untuk daftar, gte dengan nilai dari konteks", () => {
  const ctx = { salesChannels: ["offline", "marketplace"], combinedRevenue: 10, ceiling: 5 };
  expect(evaluateCondition({ field: "salesChannels", operator: "in", value: ["marketplace"] }, ctx)).toBe(true);
  expect(evaluateCondition({ field: "combinedRevenue", operator: "gte", value: "$ceiling" }, ctx)).toBe(true);
});
