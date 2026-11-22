// Parameter bawaan untuk uji unit (tanpa database).
const { DEFAULT_TAX_RULES } = require("../src/constants/defaultTaxRules");
const { DEFAULT_ADVICE_RULES } = require("../src/constants/defaultAdviceRules");

const P = (taxType) => {
  const rule = DEFAULT_TAX_RULES.find((r) => r.taxType === taxType);
  return { ...rule.parameters, ...rule.dueRule };
};

const params = {
  final: P("PPH_FINAL_UMKM"),
  badan: P("PPH_BADAN"),
  pph21: P("PPH21_TER"),
  ter: DEFAULT_TAX_RULES.find((r) => r.taxType === "PPH21_TER").parameters,
  pasal17: P("PPH21_PASAL17"),
  ptkp: P("PTKP"),
  ppn: P("PPN"),
};

const holidays = new Set(P("HARI_LIBUR").dates);
const adviceRules = DEFAULT_ADVICE_RULES.map((r) => ({ ...r, isActive: true }));

module.exports = { P, params, holidays, adviceRules };
