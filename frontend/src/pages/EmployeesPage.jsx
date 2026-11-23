// Data karyawan untuk PPh 21 (SRS FR-005): status PTKP, gaji bruto, tetap/tidak tetap, iuran pensiun.
import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage, getFieldErrors } from "../api/client";
import useApi from "../hooks/useApi";
import useCurrentBusiness from "../hooks/useCurrentBusiness";
import { useToast } from "../context/ToastContext";
import Term from "../components/Term";
import { Alert, Button, Checkbox, ConfirmButton, Empty, Field, Input, Loading, MoneyInput, PageTitle, Panel, Section, Select, td, th } from "../components/ui";
import { PTKP_OPTIONS, formatDate, formatRupiah, toDateInput } from "../utils/format";

const EMPTY = { name: "", ptkpStatus: "TK/0", employmentType: "tetap", monthlyGross: "", pensionContribution: "", joinDate: "", isActive: true };

export default function EmployeesPage() {
  const { business, guard } = useCurrentBusiness();
  const toast = useToast();
  const { data: employees, loading, error, reload } = useApi(business ? `/businesses/${business._id}/employees` : null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  if (guard) return guard;
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  function startEdit(e) {
    setEditingId(e._id);
    setForm({ ...EMPTY, ...e, joinDate: toDateInput(e.joinDate) });
  }
  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setFieldErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFieldErrors({});
    const payload = { ...form, monthlyGross: Number(form.monthlyGross) || 0, pensionContribution: Number(form.pensionContribution) || 0, joinDate: form.joinDate || null };
    try {
      if (editingId) await api.put(`/employees/${editingId}`, payload);
      else await api.post(`/businesses/${business._id}/employees`, payload);
      toast(editingId ? "Data karyawan diperbarui" : "Karyawan ditambahkan");
      reset();
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
      await api.delete(`/employees/${id}`);
      toast("Karyawan dihapus");
      reload();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  return (
    <>
      <PageTitle note={<>Data ini dipakai untuk menghitung PPh 21 dengan <Term word="TER" />. Kategori TER ditentukan otomatis dari status <Term word="PTKP" />.</>}>
        Karyawan
      </PageTitle>

      <Panel className="mb-10">
        <h2 className="mb-4 font-bold">{editingId ? `Ubah data ${form.name}` : "Tambah karyawan"}</h2>
        <Alert>{formError}</Alert>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nama" error={fieldErrors.name}><Input value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={100} /></Field>
            <Field label="Status PTKP" hint="TK = tidak kawin, K = kawin, angka = jumlah tanggungan">
              <Select value={form.ptkpStatus} onChange={(e) => set("ptkpStatus", e.target.value)}>
                {PTKP_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Status kerja">
              <Select value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
                <option value="tetap">Pegawai tetap</option>
                <option value="tidak_tetap">Pegawai tidak tetap (upah bulanan)</option>
              </Select>
            </Field>
            <Field label="Gaji bruto sebulan" hint="Gaji + tunjangan rutin" error={fieldErrors.monthlyGross}><MoneyInput value={form.monthlyGross} onChange={(v) => set("monthlyGross", v)} required /></Field>
            <Field label="Iuran pensiun/JHT dibayar pegawai per bulan"><MoneyInput value={form.pensionContribution} onChange={(v) => set("pensionContribution", v)} /></Field>
            <Field label="Mulai bekerja"><Input type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} /></Field>
          </div>
          <Checkbox label="Masih aktif bekerja" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          <div className="flex gap-3">
            <Button disabled={saving}>{saving ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Tambah karyawan"}</Button>
            {editingId && <Button type="button" variant="quiet" onClick={reset}>Batal</Button>}
          </div>
        </form>
      </Panel>

      <Section title="Daftar karyawan" aside={<Link to="/hitung?tab=pph21" className="text-sm font-semibold text-tosca-dark underline-offset-4 hover:underline">Hitung PPh 21</Link>}>
        {loading && !employees ? <Loading /> : error ? <Alert>{error}</Alert> : employees.length === 0 ? (
          <Empty>Belum ada data karyawan. Jika usaha Anda tidak punya karyawan, halaman ini boleh dikosongkan.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-md bg-white p-5 ring-1 ring-line">
            <table className="w-full min-w-[40rem] text-sm">
              <thead><tr><th className={th}>Nama</th><th className={th}>PTKP / TER</th><th className={th}>Status</th><th className={`${th} text-right`}>Gaji bruto</th><th className={th}>Mulai</th><th className={th}><span className="sr-only">Aksi</span></th></tr></thead>
              <tbody className="divide-y divide-line">
                {employees.map((e) => (
                  <tr key={e._id} className={e.isActive ? "" : "text-ink-soft"}>
                    <td className={td}>{e.name}{!e.isActive && <span className="block text-xs">Tidak aktif</span>}</td>
                    <td className={td}>{e.ptkpStatus} / kategori {e.terCategory}</td>
                    <td className={td}>{e.employmentType === "tetap" ? "Tetap" : "Tidak tetap"}</td>
                    <td className={`${td} text-right`}>{formatRupiah(e.monthlyGross)}</td>
                    <td className={td}>{formatDate(e.joinDate)}</td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <button type="button" onClick={() => startEdit(e)} className="mr-3 font-semibold text-tosca-dark underline-offset-4 hover:underline">Ubah</button>
                      <ConfirmButton title={`Hapus ${e.name}?`} onConfirm={() => handleDelete(e._id)} className="font-semibold text-due underline-offset-4 hover:underline">Hapus</ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
