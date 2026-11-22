 const { runRegression } = require("../../src/services/regressionService");
const { DEFAULT_TAX_RULES } = require("../../src/constants/defaultTaxRules");

test("Semua parameter bawaan lolos uji regresi", () => {
  for (const rule of DEFAULT_TAX_RULES) expect(runRegression(rule.taxType, rule.parameters).passed).toBe(true);
});

test("TC-API-15 (logika): tarif PPh Final diubah menjadi 1% -> uji regresi gagal", () => {
  const rule = DEFAULT_TAX_RULES.find((r) => r.taxType === "PPH_FINAL_UMKM");
  const result = runRegression("PPH_FINAL_UMKM", { ...rule.parameters, rate: 0.01 });
  expect(result.passed).toBe(false);
});
