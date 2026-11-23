// Pencatatan omzet bulanan per kanal + PPh 22 dipungut (SRS FR-004), tabel & grafik per tahun.
import { useState } from "react";
import api, { getErrorMessage, getFieldErrors } from "../api/client";
import useApi from "../hooks/useApi";
import useCurrentBusiness from "../hooks/useCurrentBusiness";
import { useToast } from "../context/ToastContext";
import RevenueChart from "../components/RevenueChart";
import Term from "../components/Term";
import { Alert, Button, ConfirmButton, Empty, Field, Input, Loading, MoneyInput, PageTitle, Panel, Section, Select, td, th } from "../components/ui";
import { MONTHS, formatRupiah } from "../utils/format";

const thisYear = new Date().getFullYear();
const emptyForm = () => ({ month: Math.max(1, new Date().getMonth()), offline: "", marketplace: "", pemerintah: "", pph22Collected: "", note: "" });

export default function RevenuePage() {
  const { business, guard } = useCurrentBusiness();
  const toast = useToast();
  const [year, setYear] = useState(thisYear);
  const { data, loading, error, reload } = useApi(business ? `/businesses/${business._id}/revenues` : null, { year });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [warnings, setWarnings] = useState([]);

  if (guard) return guard;

  const total = (Number(form.offline) || 0) + (Number(form.marketplace) || 0) + (Number(form.pemerintah) || 0);
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const usedMonths = new Set((data?.revenues || []).map((r) => r.month));

  function startEdit(r) {
    setEditingId(r._id);
    setForm({ month: r.month, offline: r.channels.offline, marketplace: r.channels.marketplace, pemerintah: r.channels.pemerintah, pph22Collected: r.pph22Collected, note: r.note || "" });
    setFormError("");
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    setSaving(true);
    const payload = {
      year,
      month: Number(form.month),
      amount: total,
      channels: { offline: Number(form.offline) || 0, marketplace: Number(form.marketplace) || 0, pemerintah: Number(form.pemerintah) || 0 },
      pph22Collected: Number(form.pph22Collected) || 0,
      note: form.note,
    };
    try {
      const res = editingId ? await api.put(`/revenues/${editingId}`, payload) : await api.post(`/businesses/${business._id}/revenues`, payload);
      setWarnings(res.data.data.warnings || []);
      toast(editingId ? "Omzet diperbarui" : `Omzet ${MONTHS[payload.month - 1]} tersimpan`);
      cancelEdit();
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/revenues/${id}`);
      toast("Omzet dihapus");
      reload();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  const months = MONTHS.map((_, i) => {
    const r = data?.revenues.find((x) => x.month === i + 1);
    return { month: i + 1, amount: r ? r.amount : null, estimatedTax: null };
  });

  return (
    <>
      <PageTitle
        note={<>Catat <Term word="omzet" /> setiap bulan, dirinci per tempat penjualan. Satu bulan hanya dicatat sekali; gunakan Ubah untuk memperbaiki.</>}
        aside={
          <label className="flex items-center gap-2 text-sm">Tahun
            <span className="w-28"><Select value={year} onChange={(e) => { setYear(Number(e.target.value)); cancelEdit(); }}>
              {[thisYear - 1, thisYear].map((y) => <option key={y}>{y}</option>)}
            </Select></span>
          </label>
        }
      >
        Omzet {year}
      </PageTitle>

      {warnings.map((w) => <Alert key={w} type="warning">{w}</Alert>)}

      <Panel className="mb-10">
        <h2 className="mb-4 font-bold">{editingId ? `Ubah omzet ${MONTHS[form.month - 1]} ${year}` : "Catat omzet bulanan"}</h2>
        <Alert>{formError}</Alert>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Bulan">
              <Select value={form.month} onChange={(e) => set("month", Number(e.target.value))} disabled={Boolean(editingId)}>
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1} disabled={!editingId && usedMonths.has(i + 1)}>{name}{!editingId && usedMonths.has(i + 1) ? " (sudah dicatat)" : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Penjualan langsung / toko"><MoneyInput value={form.offline} onChange={(v) => set("offline", v)} /></Field>
            <Field label="Penjualan marketplace"><MoneyInput value={form.marketplace} onChange={(v) => set("marketplace", v)} /></Field>
            <Field label="Penjualan ke pemerintah"><MoneyInput value={form.pemerintah} onChange={(v) => set("pemerintah", v)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={<><Term word="PPh 22" /> yang sudah dipungut (opsional)</>} hint="Lihat di laporan marketplace atau bukti potong bendahara. Mengurangi PPh Final yang disetor sendiri." error={fieldErrors.pph22Collected}>
              <MoneyInput value={form.pph22Collected} onChange={(v) => set("pph22Collected", v)} />
            </Field>
            <Field label="Catatan (opsional)"><Input value={form.note} maxLength={300} onChange={(e) => set("note", e.target.value)} /></Field>
          </div>
          {fieldErrors.channels && <Alert>{fieldErrors.channels}</Alert>}
          <div className="flex flex-wrap items-center gap-4">
            <p>Total omzet bulan ini: <strong className="text-lg">{formatRupiah(total)}</strong></p>
            <Button disabled={saving || total <= 0}>{saving ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Simpan omzet"}</Button>
            {editingId && <Button type="button" variant="quiet" onClick={cancelEdit}>Batal</Button>}
          </div>
        </form>
      </Panel>

      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : (
        <>
          <Section title="Grafik omzet">
            <Panel><RevenueChart months={months} showTax={false} /></Panel>
          </Section>

          <Section title="Riwayat omzet" className="mt-6">
            {data.revenues.length === 0 ? <Empty>Belum ada omzet yang dicatat untuk tahun {year}.</Empty> : (
              <div className="overflow-x-auto rounded-md bg-white p-5 ring-1 ring-line">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr><th className={th}>Bulan</th><th className={`${th} text-right`}>Langsung</th><th className={`${th} text-right`}>Marketplace</th><th className={`${th} text-right`}>Pemerintah</th><th className={`${th} text-right`}>Total</th><th className={`${th} text-right`}>PPh 22</th><th className={th}><span className="sr-only">Aksi</span></th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.revenues.map((r) => (
                      <tr key={r._id}>
                        <td className={td}>{MONTHS[r.month - 1]}{r.note && <span className="block text-xs text-ink-soft">{r.note}</span>}</td>
                        <td className={`${td} text-right`}>{formatRupiah(r.channels.offline)}</td>
                        <td className={`${td} text-right`}>{formatRupiah(r.channels.marketplace)}</td>
                        <td className={`${td} text-right`}>{formatRupiah(r.channels.pemerintah)}</td>
                        <td className={`${td} text-right font-semibold`}>{formatRupiah(r.amount)}</td>
                        <td className={`${td} text-right`}>{formatRupiah(r.pph22Collected)}</td>
                        <td className={`${td} whitespace-nowrap text-right`}>
                          <button type="button" onClick={() => startEdit(r)} className="mr-3 font-semibold text-tosca-dark underline-offset-4 hover:underline">Ubah</button>
                          <ConfirmButton title={`Hapus omzet ${MONTHS[r.month - 1]}?`} message="Rekomendasi dan kalender akan dihitung ulang." onConfirm={() => handleDelete(r._id)}
                            className="font-semibold text-due underline-offset-4 hover:underline" aria-label={`Hapus omzet ${MONTHS[r.month - 1]}`}>Hapus</ConfirmButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink font-bold"><td className={td} colSpan={4}>Total {year}</td><td className={`${td} text-right`}>{formatRupiah(data.cumulative)}</td><td colSpan={2} /></tr>
                  </tfoot>
                </table>
                {data.combined !== data.cumulative && (
                  <p className="mt-3 text-sm text-ink-soft">Omzet gabungan (dengan usaha lain milik Anda dan pasangan): <strong>{formatRupiah(data.combined)}</strong></p>
                )}
              </div>
            )}
          </Section>
        </>
      )}
    </>
  );
}
