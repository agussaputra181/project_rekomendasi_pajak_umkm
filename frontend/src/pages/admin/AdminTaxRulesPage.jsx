// Aturan tarif berversi (SRS FR-017): buat versi baru sebagai draf, ubah draf, uji regresi,
// aktifkan (ditolak 422 bila uji gagal), dan nonaktifkan.
import { useState } from "react";
import api, { getErrorMessage } from "../../api/client";
import useApi from "../../hooks/useApi";
import { useToast } from "../../context/ToastContext";
import { Alert, Button, Field, Input, Loading, PageTitle, Panel, Section, Select, Textarea } from "../../components/ui";
import { TAX_RULE_LABEL, formatDate, toDateInput } from "../../utils/format";

function RegressionResult({ result }) {
  if (!result) return null;
  return (
    <div className={`mt-3 rounded-md border-l-4 bg-white px-4 py-3 text-sm ring-1 ring-line ${result.passed ? "border-ok" : "border-due"}`}>
      <p className="font-bold">{result.passed ? "Semua uji lolos" : "Ada uji yang gagal"}</p>
      <ul className="mt-2 space-y-1">
        {result.results.map((r) => (
          <li key={r.id} className={r.passed ? "text-ink-soft" : "font-semibold text-due"}>
            {r.passed ? "Lolos" : "Gagal"}: {r.description} (harapan {String(r.expected)}, hasil {String(r.actual)})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminTaxRulesPage() {
  const toast = useToast();
  const { data: rules, loading, error, reload } = useApi("/tax-rules");
  const regulations = useApi("/regulations", { limit: 100, sort: "title" });
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [results, setResults] = useState({}); // hasil uji per id versi

  if (loading && !rules) return <Loading />;
  if (error) return <Alert>{error}</Alert>;

  const groups = {};
  for (const r of rules) (groups[r.taxType] ||= []).push(r);

  function newVersion(taxType) {
    const base = groups[taxType].find((r) => r.isActive) || groups[taxType][0];
    setForm({
      taxType, parameters: JSON.stringify(base.parameters, null, 2), effectiveFrom: new Date().toISOString().slice(0, 10),
      note: "", regulationId: base.regulationId?._id || "", base: base.base || "", mechanism: base.mechanism, dueRule: { ...base.dueRule },
    });
    setFormError("");
  }
  function editDraft(r) {
    setForm({ ...r, parameters: JSON.stringify(r.parameters, null, 2), effectiveFrom: toDateInput(r.effectiveFrom), regulationId: r.regulationId?._id || "", dueRule: { ...r.dueRule } });
    setFormError("");
  }

  async function save(e) {
    e.preventDefault();
    setFormError("");
    let parameters;
    try {
      parameters = JSON.parse(form.parameters);
    } catch {
      setFormError("Parameter harus berupa JSON yang valid. Periksa tanda kutip dan koma.");
      return;
    }
    const payload = { taxType: form.taxType, parameters, effectiveFrom: form.effectiveFrom, note: form.note, regulationId: form.regulationId || undefined, base: form.base, mechanism: form.mechanism, dueRule: form.dueRule };
    try {
      if (form._id) await api.put(`/tax-rules/${form._id}`, payload);
      else await api.post("/tax-rules", payload);
      toast(form._id ? "Draf diperbarui" : "Versi baru dibuat sebagai draf");
      setForm(null);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  async function test(r) {
    try {
      const res = await api.post(`/tax-rules/${r._id}/test`);
      setResults((x) => ({ ...x, [r._id]: res.data.data }));
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  async function activate(r) {
    try {
      const res = await api.post(`/tax-rules/${r._id}/activate`);
      setResults((x) => ({ ...x, [r._id]: res.data.data.regression }));
      toast(`Versi ${r.version} ${TAX_RULE_LABEL[r.taxType]} aktif. Pengguna diberi notifikasi.`);
      reload();
    } catch (err) {
      // 422: uji regresi gagal -> tampilkan rincian
      const failed = err.response?.data?.errors || [];
      setResults((x) => ({ ...x, [r._id]: { passed: false, results: failed.map((f) => ({ id: f.field, description: f.field, expected: f.message, actual: "", passed: false })) } }));
      toast(getErrorMessage(err), "error");
    }
  }

  async function deactivate(r) {
    try {
      await api.put(`/tax-rules/${r._id}`, { isActive: false });
      toast("Versi dinonaktifkan");
      reload();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  return (
    <>
      <PageTitle note="Tarif, batas omzet, tabel TER, PTKP, jatuh tempo, dan hari libur disimpan berversi. Versi baru harus lolos uji regresi sebelum aktif.">Aturan tarif</PageTitle>

      {form && (
        <Panel className="mb-8">
          <h2 className="mb-4 font-bold">{form._id ? `Ubah draf ${TAX_RULE_LABEL[form.taxType]} versi ${form.version}` : `Versi baru ${TAX_RULE_LABEL[form.taxType]}`}</h2>
          <Alert>{formError}</Alert>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Mulai berlaku"><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} required /></Field>
              <Field label="Dasar hukum">
                <Select value={form.regulationId} onChange={(e) => setForm({ ...form, regulationId: e.target.value })}>
                  <option value="">-</option>{(regulations.data || []).map((r) => <option key={r._id} value={r._id}>{r.number}</option>)}
                </Select>
              </Field>
              <Field label="Mekanisme">
                <Select value={form.mechanism} onChange={(e) => setForm({ ...form, mechanism: e.target.value })}>
                  <option value="setor_sendiri">Setor sendiri</option><option value="dipotong">Dipotong</option><option value="dipungut">Dipungut</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Tanggal setor"><Input type="number" min="1" max="31" value={form.dueRule.payDay ?? ""} onChange={(e) => setForm({ ...form, dueRule: { ...form.dueRule, payDay: e.target.value ? Number(e.target.value) : null } })} /></Field>
              <Field label="Tanggal lapor"><Input type="number" min="1" max="31" value={form.dueRule.reportDay ?? ""} onChange={(e) => setForm({ ...form, dueRule: { ...form.dueRule, reportDay: e.target.value ? Number(e.target.value) : null } })} /></Field>
              <Field label="Batas tahunan (DD-MM)"><Input value={form.dueRule.annualDeadline ?? ""} onChange={(e) => setForm({ ...form, dueRule: { ...form.dueRule, annualDeadline: e.target.value || null } })} /></Field>
              <Field label="Dasar pengenaan"><Input value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} /></Field>
            </div>
            <Field label="Parameter (JSON)" hint="Contoh PPh Final: rate 0.005 = 0,5%. Angka uang ditulis tanpa titik.">
              <Textarea className="min-h-72 font-mono text-sm" spellCheck={false} value={form.parameters} onChange={(e) => setForm({ ...form, parameters: e.target.value })} />
            </Field>
            <Field label="Catatan perubahan"><Input value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <div className="flex gap-3"><Button>Simpan sebagai draf</Button><Button type="button" variant="quiet" onClick={() => setForm(null)}>Batal</Button></div>
          </form>
        </Panel>
      )}

      <div className="space-y-8">
        {Object.entries(groups).map(([taxType, versions]) => (
          <Section key={taxType} title={TAX_RULE_LABEL[taxType] || taxType} aside={<Button variant="quiet" onClick={() => newVersion(taxType)}>Buat versi baru</Button>}>
            <ul className="space-y-3">
              {versions.map((r) => (
                <li key={r._id} className={`rounded-md bg-white p-5 ring-1 ${r.isActive ? "ring-2 ring-tosca" : "ring-line"}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p>
                      <span className="font-bold">Versi {r.version}</span>{" "}
                      <span className={`text-sm font-semibold ${r.isActive ? "text-tosca-dark" : "text-ink-soft"}`}>{r.isActive ? "Aktif" : r.effectiveTo ? "Tidak aktif" : "Draf"}</span>
                      <span className="block text-sm text-ink-soft">Berlaku {formatDate(r.effectiveFrom)}{r.effectiveTo ? ` s.d. ${formatDate(r.effectiveTo)}` : ""}{r.regulationId ? `, dasar ${r.regulationId.number}` : ""}{r.note ? `. ${r.note}` : ""}</span>
                    </p>
                    <span className="flex flex-wrap gap-3 text-sm font-semibold">
                      <button type="button" onClick={() => test(r)} className="text-tosca-dark underline-offset-4 hover:underline">Uji regresi</button>
                      {!r.isActive && <button type="button" onClick={() => editDraft(r)} className="text-tosca-dark underline-offset-4 hover:underline">Ubah draf</button>}
                      {!r.isActive && <button type="button" onClick={() => activate(r)} className="text-tosca-dark underline-offset-4 hover:underline">Uji & aktifkan</button>}
                      {r.isActive && <button type="button" onClick={() => deactivate(r)} className="text-due underline-offset-4 hover:underline">Nonaktifkan</button>}
                    </span>
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-ink-soft">Lihat parameter</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-paper p-3 text-xs">{JSON.stringify(r.parameters, null, 2)}</pre>
                  </details>
                  <RegressionResult result={results[r._id]} />
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </>
  );
}
