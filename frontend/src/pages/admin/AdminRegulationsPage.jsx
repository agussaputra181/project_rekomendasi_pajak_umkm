// CRUD regulasi oleh Admin (SRS FR-017) dengan pencarian & pagination.
import { useState } from "react";
import api, { getErrorMessage, getFieldErrors } from "../../api/client";
import useApi from "../../hooks/useApi";
import { useToast } from "../../context/ToastContext";
import { Alert, Button, Checkbox, ConfirmButton, Field, Input, Loading, PageTitle, Pagination, Panel, Select, Textarea, td, th } from "../../components/ui";
import { AFFECTED_TAX_OPTIONS, REG_STATUS_LABEL, REG_TYPE_LABEL, formatDate, toDateInput } from "../../utils/format";

const EMPTY = { number: "", title: "", type: "PMK", effectiveDate: "", status: "berlaku", summaryPlain: "", affectedTaxTypes: [], region: "", sourceUrl: "", replacedBy: "", tags: "" };

export default function AdminRegulationsPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, pagination, loading, error, reload } = useApi("/regulations", { q: q || undefined, page, limit: 10, sort: q ? undefined : "-effectiveDate" });
  const all = useApi("/regulations", { limit: 100, sort: "title" });
  const [form, setForm] = useState(null); // null = form tertutup
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  function edit(r) {
    setForm({ ...EMPTY, ...r, effectiveDate: toDateInput(r.effectiveDate), replacedBy: r.replacedBy?._id || "", tags: (r.tags || []).join(", ") });
    setFormError("");
    setFieldErrors({});
  }

  async function save(e) {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    const payload = { ...form, effectiveDate: form.effectiveDate || null, replacedBy: form.replacedBy || null, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    try {
      if (form._id) await api.put(`/regulations/${form._id}`, payload);
      else await api.post("/regulations", payload);
      toast("Regulasi tersimpan");
      setForm(null);
      reload();
      all.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    }
  }

  async function remove(r) {
    try {
      await api.delete(`/regulations/${r._id}`);
      toast("Regulasi dihapus");
      reload();
    } catch (err) {
      toast(getErrorMessage(err), "error"); // 409 bila masih dirujuk
    }
  }

  return (
    <>
      <PageTitle note="Regulasi yang masih dirujuk aturan atau artikel tidak bisa dihapus; ubah statusnya menjadi dicabut." aside={<Button onClick={() => edit(EMPTY)}>Tambah regulasi</Button>}>Regulasi</PageTitle>

      {form && (
        <Panel className="mb-8">
          <h2 className="mb-4 font-bold">{form._id ? `Ubah ${form.number}` : "Regulasi baru"}</h2>
          <Alert>{formError}</Alert>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nomor" hint="Contoh: PP 20/2026" error={fieldErrors.number}><Input value={form.number} onChange={(e) => set("number", e.target.value)} required /></Field>
              <Field label="Jenis"><Select value={form.type} onChange={(e) => set("type", e.target.value)}>{Object.entries(REG_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              <Field label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(REG_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            </div>
            <Field label="Judul" error={fieldErrors.title}><Input value={form.title} onChange={(e) => set("title", e.target.value)} required /></Field>
            <Field label="Ringkasan bahasa awam" hint={`${form.summaryPlain.length}/1000 karakter`} error={fieldErrors.summaryPlain}><Textarea maxLength={1000} value={form.summaryPlain} onChange={(e) => set("summaryPlain", e.target.value)} /></Field>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Jenis pajak terdampak</legend>
              <div className="flex flex-wrap gap-4">
                {AFFECTED_TAX_OPTIONS.map((t) => (
                  <Checkbox key={t} label={t} checked={form.affectedTaxTypes.includes(t)}
                    onChange={() => set("affectedTaxTypes", form.affectedTaxTypes.includes(t) ? form.affectedTaxTypes.filter((x) => x !== t) : [...form.affectedTaxTypes, t])} />
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Mulai berlaku"><Input type="date" value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} /></Field>
              <Field label="Daerah (khusus perda)"><Input value={form.region} onChange={(e) => set("region", e.target.value)} /></Field>
              <Field label="Diubah/diganti oleh">
                <Select value={form.replacedBy} onChange={(e) => set("replacedBy", e.target.value)}>
                  <option value="">Tidak ada</option>
                  {(all.data || []).filter((r) => r._id !== form._id).map((r) => <option key={r._id} value={r._id}>{r.number}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tautan sumber resmi"><Input type="url" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} /></Field>
              <Field label="Kata kunci (pisahkan dengan koma)"><Input value={form.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
            </div>
            <div className="flex gap-3"><Button>Simpan</Button><Button type="button" variant="quiet" onClick={() => setForm(null)}>Batal</Button></div>
          </form>
        </Panel>
      )}

      <form role="search" className="mb-4 flex max-w-lg gap-2" onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }}>
        <Input type="search" placeholder="Cari regulasi" aria-label="Cari regulasi" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button>Cari</Button>
      </form>

      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : (
        <div className="overflow-x-auto rounded-md bg-white p-5 ring-1 ring-line">
          <table className="w-full min-w-[44rem] text-sm">
            <thead><tr><th className={th}>Nomor & judul</th><th className={th}>Status</th><th className={th}>Berlaku</th><th className={th}><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((r) => (
                <tr key={r._id}>
                  <td className={td}><span className="font-semibold">{r.number}</span><span className="block text-ink-soft">{r.title}</span></td>
                  <td className={td}>{REG_STATUS_LABEL[r.status]}</td>
                  <td className={td}>{formatDate(r.effectiveDate)}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button type="button" onClick={() => edit(r)} className="mr-3 font-semibold text-tosca-dark underline-offset-4 hover:underline">Ubah</button>
                    <ConfirmButton title={`Hapus ${r.number}?`} onConfirm={() => remove(r)} className="font-semibold text-due underline-offset-4 hover:underline">Hapus</ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination pagination={pagination} onChange={setPage} />
        </div>
      )}
    </>
  );
}
