// Aturan saran R-01 s.d. R-15 (SRS Tabel 29) yang bisa diubah Admin tanpa mengubah kode:
// kondisi (field, operator, nilai), penjelasan, langkah saran, dasar aturan, aktif/nonaktif.
import { useState } from "react";
import api, { getErrorMessage, getFieldErrors } from "../../api/client";
import useApi from "../../hooks/useApi";
import { useToast } from "../../context/ToastContext";
import { Alert, Button, Checkbox, ConfirmButton, Field, Input, Loading, PageTitle, Panel, Select, Textarea, td, th } from "../../components/ui";
import { TAX_LABEL } from "../../utils/format";

const OPERATOR_LABEL = { eq: "sama dengan", ne: "tidak sama dengan", in: "salah satu dari", nin: "bukan salah satu dari", gt: "lebih dari", gte: "lebih dari atau sama", lt: "kurang dari", lte: "kurang dari atau sama", before: "sebelum tanggal", after: "sesudah tanggal" };
const VARIABLES = "{omzetKumulatif} {omzetSetahun} {omzetGabungan} {batasBebas} {batasOmzet} {tarifFinal} {persenBatas} {batasTerdekat} {tahunAkhirFasilitas} {kota} {tahun}";
const EMPTY = { code: "", name: "", taxType: "PPH_FINAL", applicable: true, priority: 10, explanation: "", actionSteps: "", conditions: [], regulationIds: [], isActive: true };

// Nilai kondisi ditulis sebagai teks; JSON (angka, true/false, ["a","b"]) diubah ke tipe aslinya
const valueToText = (v) => (typeof v === "string" ? v : JSON.stringify(v));
function textToValue(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default function AdminAdviceRulesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi("/advice-rules");
  const regulations = useApi("/regulations", { limit: 100, sort: "title" });
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  const { rules, catalog } = data;

  function edit(rule) {
    setForm({
      ...EMPTY,
      ...rule,
      actionSteps: (rule.actionSteps || []).join("\n"),
      conditions: (rule.conditions || []).map((c) => ({ ...c, value: valueToText(c.value) })),
      regulationIds: (rule.regulationIds || []).map((r) => r._id || r),
    });
    setFormError("");
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const setCondition = (i, patch) => setForm((f) => ({ ...f, conditions: f.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  async function save(e) {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    const payload = {
      ...form,
      priority: Number(form.priority) || 0,
      actionSteps: form.actionSteps.split("\n").map((s) => s.trim()).filter(Boolean),
      conditions: form.conditions.map((c) => ({ field: c.field, operator: c.operator, value: textToValue(c.value) })),
    };
    try {
      if (form._id) await api.put(`/advice-rules/${form._id}`, payload);
      else await api.post("/advice-rules", payload);
      toast("Aturan saran tersimpan. Rekomendasi pengguna berubah saat dihitung ulang.");
      setForm(null);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    }
  }

  async function deactivate(rule) {
    try {
      await api.delete(`/advice-rules/${rule._id}`);
      toast(`${rule.code} dinonaktifkan`);
      reload();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  return (
    <>
      <PageTitle note="Kondisi digabung dengan DAN. Nilai yang diawali $ diambil dari data konteks, misalnya $ceiling = batas omzet dari aturan tarif aktif." aside={<Button onClick={() => edit(EMPTY)}>Tambah aturan</Button>}>
        Aturan saran
      </PageTitle>

      {form && (
        <Panel className="mb-8">
          <h2 className="mb-4 font-bold">{form._id ? `Ubah ${form.code} (versi ${form.version})` : "Aturan saran baru"}</h2>
          <Alert>{formError}</Alert>
          {Object.keys(fieldErrors).length > 0 && <Alert>{Object.entries(fieldErrors).map(([f, m]) => <span key={f} className="block">{f}: {m}</span>)}</Alert>}
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Kode"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="R-16" /></Field>
              <Field label="Nama aturan"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
              <Field label="Jenis pajak"><Select value={form.taxType} onChange={(e) => setForm({ ...form, taxType: e.target.value })}>{Object.entries(TAX_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              <Field label="Urutan tampil"><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></Field>
            </div>
            <div className="flex flex-wrap gap-6">
              <Checkbox label="Pajak berlaku (hapus centang bila aturan ini menjelaskan pajak yang tidak berlaku)" checked={form.applicable} onChange={(e) => setForm({ ...form, applicable: e.target.checked })} />
              <Checkbox label="Aktif" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Kondisi</legend>
              <div className="space-y-2">
                {form.conditions.map((c, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_12rem_1fr_auto]">
                    <Select aria-label="Field" value={c.field} onChange={(e) => setCondition(i, { field: e.target.value })}>
                      {catalog.fields.map((f) => <option key={f.field} value={f.field}>{f.field}: {f.description}</option>)}
                    </Select>
                    <Select aria-label="Operator" value={c.operator} onChange={(e) => setCondition(i, { operator: e.target.value })}>
                      {catalog.operators.map((op) => <option key={op} value={op}>{OPERATOR_LABEL[op] || op}</option>)}
                    </Select>
                    <Input aria-label="Nilai" value={c.value} onChange={(e) => setCondition(i, { value: e.target.value })} placeholder='contoh: OP, true, 500000000, $ceiling, ["OP","KOPERASI"]' />
                    <Button type="button" variant="quiet" onClick={() => setForm({ ...form, conditions: form.conditions.filter((_, j) => j !== i) })}>Hapus</Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="quiet" className="mt-2" onClick={() => setForm({ ...form, conditions: [...form.conditions, { field: "entityType", operator: "eq", value: "OP" }] })}>Tambah kondisi</Button>
            </fieldset>

            <Field label="Penjelasan untuk pengguna" hint={`Variabel yang bisa dipakai: ${VARIABLES}`}><Textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} required /></Field>
            <Field label="Langkah saran (satu baris satu langkah)"><Textarea value={form.actionSteps} onChange={(e) => setForm({ ...form, actionSteps: e.target.value })} /></Field>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Dasar aturan</legend>
              <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md p-3 ring-1 ring-line sm:grid-cols-2">
                {(regulations.data || []).map((r) => (
                  <Checkbox key={r._id} label={r.number} checked={form.regulationIds.includes(r._id)}
                    onChange={() => setForm({ ...form, regulationIds: form.regulationIds.includes(r._id) ? form.regulationIds.filter((x) => x !== r._id) : [...form.regulationIds, r._id] })} />
                ))}
              </div>
            </fieldset>
            <div className="flex gap-3"><Button>Simpan</Button><Button type="button" variant="quiet" onClick={() => setForm(null)}>Batal</Button></div>
          </form>
        </Panel>
      )}

      <div className="overflow-x-auto rounded-md bg-white p-5 ring-1 ring-line">
        <table className="w-full min-w-[52rem] text-sm">
          <thead><tr><th className={th}>Kode</th><th className={th}>Aturan</th><th className={th}>Kondisi</th><th className={th}>Hasil</th><th className={th}>Status</th><th className={th}><span className="sr-only">Aksi</span></th></tr></thead>
          <tbody className="divide-y divide-line">
            {rules.map((r) => (
              <tr key={r._id} className={r.isActive ? "" : "text-ink-soft"}>
                <td className={`${td} font-bold`}>{r.code}</td>
                <td className={td}>{r.name}<span className="block text-xs text-ink-soft">versi {r.version}, urutan {r.priority}</span></td>
                <td className={td}><ul className="text-xs">{r.conditions.map((c, i) => <li key={i}><code>{c.field}</code> {OPERATOR_LABEL[c.operator]} <code>{valueToText(c.value)}</code></li>)}</ul></td>
                <td className={td}>{TAX_LABEL[r.taxType] || r.taxType}<span className="block text-xs">{r.applicable ? "berlaku" : "tidak berlaku"}</span></td>
                <td className={td}>{r.isActive ? "Aktif" : "Nonaktif"}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <button type="button" onClick={() => edit(r)} className="mr-3 font-semibold text-tosca-dark underline-offset-4 hover:underline">Ubah</button>
                  {r.isActive && <ConfirmButton title={`Nonaktifkan ${r.code}?`} message="Aturan tidak dipakai lagi saat rekomendasi dihitung ulang." confirmLabel="Nonaktifkan" onConfirm={() => deactivate(r)} className="font-semibold text-due underline-offset-4 hover:underline">Nonaktifkan</ConfirmButton>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
