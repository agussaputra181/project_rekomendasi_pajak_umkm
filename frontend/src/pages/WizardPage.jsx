// Wizard profil usaha (SRS FR-003): pertanyaan bertahap berbahasa awam + penjelasan tiap pertanyaan.
// mode="create" -> POST /businesses, mode="edit" -> PUT /businesses/:id (+ hapus usaha)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage, getFieldErrors } from "../api/client";
import { useBusiness } from "../context/BusinessContext";
import { useToast } from "../context/ToastContext";
import Term from "../components/Term";
import { Alert, Button, Checkbox, ConfirmButton, Field, Input, MoneyInput, PageTitle, Panel, Select } from "../components/ui";
import { CHANNEL_LABEL, ENTITY_LABEL, SECTOR_LABEL, toDateInput } from "../utils/format";

const EMPTY = {
  businessName: "", entityType: "OP", registeredDate: "", facilityStartYear: "", sector: "dagang",
  salesChannels: ["offline"], marketplaceStatementSent: false, hasEmployees: false, ownsBusinessProperty: false,
  hasNPWP: false, npwp: "", isPKP: false,
  address: { street: "", district: "", city: "", province: "" },
  spouse: { hasBusiness: false, estimatedAnnualRevenue: "" },
  estimatedAnnualRevenue: "",
};

const ENTITY_HELP = {
  OP: "Usaha atas nama Anda sendiri, belum berbadan hukum.",
  PT_PERORANGAN: "Perseroan yang didirikan oleh satu orang (UMK).",
  KOPERASI: "Badan usaha koperasi.",
  CV: "Persekutuan komanditer.",
  FIRMA: "Persekutuan firma.",
  PT: "Perseroan terbatas biasa (lebih dari satu pendiri).",
  BUMDES: "Badan usaha milik desa.",
};

const STEPS = ["Bentuk usaha", "Kegiatan usaha", "Karyawan & pajak", "Alamat", "Perkiraan omzet"];

export default function WizardPage({ mode }) {
  const isEdit = mode === "edit";
  const navigate = useNavigate();
  const toast = useToast();
  const { business, reload, selectBusiness } = useBusiness();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Mode ubah: isi form dengan data usaha yang dipilih
  useEffect(() => {
    if (isEdit && business) {
      setForm({
        ...EMPTY,
        ...business,
        registeredDate: toDateInput(business.registeredDate),
        facilityStartYear: business.facilityStartYear || "",
        npwp: business.npwp || "",
        address: { ...EMPTY.address, ...(business.address || {}) },
        spouse: { ...EMPTY.spouse, ...(business.spouse || {}) },
      });
    }
  }, [isEdit, business]);

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const setNested = (group, name, value) => setForm((f) => ({ ...f, [group]: { ...f[group], [name]: value } }));
  function toggleChannel(channel) {
    const list = form.salesChannels.includes(channel) ? form.salesChannels.filter((c) => c !== channel) : [...form.salesChannels, channel];
    set("salesChannels", list);
  }

  const isFamily = ["OP", "PT_PERORANGAN"].includes(form.entityType);
  const needsFacilityYear = !["OP"].includes(form.entityType);

  async function handleSubmit(e) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setError("");
    setFieldErrors({});
    setSaving(true);
    const payload = {
      ...form,
      registeredDate: form.registeredDate || null,
      facilityStartYear: form.facilityStartYear ? Number(form.facilityStartYear) : undefined,
      npwp: form.hasNPWP ? form.npwp : "",
      estimatedAnnualRevenue: Number(form.estimatedAnnualRevenue) || 0,
      spouse: { hasBusiness: isFamily && form.spouse.hasBusiness, estimatedAnnualRevenue: isFamily && form.spouse.hasBusiness ? Number(form.spouse.estimatedAnnualRevenue) || 0 : 0 },
      marketplaceStatementSent: form.salesChannels.includes("marketplace") && form.marketplaceStatementSent,
    };
    try {
      if (isEdit) {
        await api.put(`/businesses/${business._id}`, payload);
        toast("Profil usaha diperbarui. Rekomendasi sudah dihitung ulang.");
        await reload();
      } else {
        const res = await api.post("/businesses", payload);
        await reload();
        selectBusiness(res.data.data.business._id);
        toast("Profil usaha tersimpan. Berikut pajak yang berlaku untuk Anda.");
      }
      navigate("/rekomendasi");
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/businesses/${business._id}`);
      toast("Usaha dan seluruh datanya dihapus");
      await reload();
      navigate("/");
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  if (isEdit && !business) return <PageTitle>Profil usaha</PageTitle>;

  return (
    <>
      <PageTitle note="Jawab beberapa pertanyaan singkat. Sistem memakai jawaban ini untuk menentukan pajak yang berlaku.">
        {isEdit ? `Profil ${business.businessName}` : "Profil usaha baru"}
      </PageTitle>

      {/* Penanda langkah */}
      <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Langkah wizard">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <button type="button" onClick={() => setStep(i)} className={`border-b-2 pb-1 ${i === step ? "border-tosca font-bold" : i < step ? "border-transparent text-ink" : "border-transparent text-ink-soft"}`}>
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <Alert>{error}</Alert>
      {Object.keys(fieldErrors).length > 0 && (
        <Alert>{Object.entries(fieldErrors).map(([f, m]) => <span key={f} className="block">{f}: {m}</span>)}</Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Panel className="max-w-2xl space-y-5">
          {step === 0 && (
            <>
              <Field label="Nama usaha" error={fieldErrors.businessName}>
                <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required maxLength={150} />
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Bentuk usaha</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(ENTITY_LABEL).map(([value, label]) => (
                    <label key={value} className={`cursor-pointer rounded-md p-3 ring-1 ${form.entityType === value ? "bg-tosca-wash ring-tosca" : "ring-line"}`}>
                      <input type="radio" name="entityType" value={value} checked={form.entityType === value} onChange={() => set("entityType", value)} className="mr-2 accent-tosca" />
                      <span className="font-semibold">{label}</span>
                      <span className="mt-1 block text-xs text-ink-soft">{ENTITY_HELP[value]}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-soft">Kenapa ditanya? Sejak PP 20/2026, PPh Final 0,5% hanya untuk orang pribadi, PT perorangan, dan koperasi.</p>
              </fieldset>
              <Field label="Tanggal mulai terdaftar sebagai wajib pajak (opsional)" hint="Dipakai untuk aturan peralihan PP 20/2026 (badan yang terdaftar sebelum 22 April 2026).">
                <Input type="date" value={form.registeredDate} onChange={(e) => set("registeredDate", e.target.value)} />
              </Field>
              {needsFacilityYear && (
                <Field label="Tahun pertama memakai PPh Final 0,5% (kosongkan bila belum pernah)" hint="Koperasi maksimal 4 tahun; CV/firma/BUMDes 4 tahun dan PT 3 tahun sesuai PP 55/2022.">
                  <Input type="number" min="2013" max="2100" value={form.facilityStartYear} onChange={(e) => set("facilityStartYear", e.target.value)} />
                </Field>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Bidang usaha" hint="Kenapa ditanya? Usaha kuliner bisa kena pajak restoran daerah; pekerjaan bebas tidak bisa memakai PPh Final.">
                <Select value={form.sector} onChange={(e) => set("sector", e.target.value)}>
                  {Object.entries(SECTOR_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-semibold">Di mana Anda menjual?</legend>
                {Object.entries(CHANNEL_LABEL).map(([value, label]) => (
                  <Checkbox key={value} label={label} checked={form.salesChannels.includes(value)} onChange={() => toggleChannel(value)}
                    hint={value === "marketplace" ? "Marketplace memungut PPh 22 0,5% dari penjualan." : value === "pemerintah" ? "Bendahara pemerintah memungut PPh 22 1,5% kecuali ada Surat Keterangan PP 55." : undefined} />
                ))}
              </fieldset>
              {form.salesChannels.includes("marketplace") && (
                <Checkbox label="Saya sudah mengirim surat pernyataan omzet ke marketplace" hint="Orang pribadi dengan omzet sampai Rp500 juta tidak dipungut PPh 22 bila sudah mengirim surat pernyataan."
                  checked={form.marketplaceStatementSent} onChange={(e) => set("marketplaceStatementSent", e.target.checked)} />
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Checkbox label="Saya mempekerjakan karyawan" hint="Pemberi kerja wajib memotong PPh 21 dari gaji karyawan." checked={form.hasEmployees} onChange={(e) => set("hasEmployees", e.target.checked)} />
              <Checkbox label="Saya memiliki tanah/bangunan tempat usaha" hint="Tanah dan bangunan dikenai PBB-P2 setiap tahun." checked={form.ownsBusinessProperty} onChange={(e) => set("ownsBusinessProperty", e.target.checked)} />
              <Checkbox label={<>Saya sudah punya <Term word="NPWP" /> atau NIK sudah aktif di Coretax</>} checked={form.hasNPWP} onChange={(e) => set("hasNPWP", e.target.checked)} />
              {form.hasNPWP && (
                <Field label="Nomor NPWP / NIK (15 atau 16 digit)" error={fieldErrors.npwp}>
                  <Input inputMode="numeric" value={form.npwp} onChange={(e) => set("npwp", e.target.value.replace(/\D/g, "").slice(0, 16))} />
                </Field>
              )}
              <Checkbox label={<>Usaha saya sudah dikukuhkan sebagai <Term word="PKP" /></>} checked={form.isPKP} onChange={(e) => set("isPKP", e.target.checked)} />
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-ink-soft">Kota dipakai untuk informasi pajak daerah (PBJT dan PBB).</p>
              <Field label="Alamat"><Input autoComplete="street-address" value={form.address.street} onChange={(e) => setNested("address", "street", e.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Kecamatan"><Input value={form.address.district} onChange={(e) => setNested("address", "district", e.target.value)} /></Field>
                <Field label="Kota/kabupaten"><Input autoComplete="address-level2" value={form.address.city} onChange={(e) => setNested("address", "city", e.target.value)} /></Field>
                <Field label="Provinsi"><Input autoComplete="address-level1" value={form.address.province} onChange={(e) => setNested("address", "province", e.target.value)} /></Field>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <Field label={<>Perkiraan <Term word="omzet" /> setahun</>} hint="Dipakai sebelum Anda mencatat omzet bulanan. Setelah omzet dicatat, sistem memakai angka terbesar." error={fieldErrors.estimatedAnnualRevenue}>
                <MoneyInput value={form.estimatedAnnualRevenue} onChange={(v) => set("estimatedAnnualRevenue", v)} />
              </Field>
              {isFamily && (
                <>
                  <Checkbox label="Suami/istri saya juga punya usaha" hint="Sesuai PP 20/2026, omzet suami-istri digabung untuk menghitung batas Rp4,8 miliar." checked={form.spouse.hasBusiness} onChange={(e) => setNested("spouse", "hasBusiness", e.target.checked)} />
                  {form.spouse.hasBusiness && (
                    <Field label="Perkiraan omzet usaha pasangan setahun">
                      <MoneyInput value={form.spouse.estimatedAnnualRevenue} onChange={(v) => setNested("spouse", "estimatedAnnualRevenue", v)} />
                    </Field>
                  )}
                </>
              )}
            </>
          )}
        </Panel>

        <div className="mt-6 flex max-w-2xl flex-wrap items-center gap-3">
          {step > 0 && <Button type="button" variant="quiet" onClick={() => setStep(step - 1)}>Kembali</Button>}
          <Button disabled={saving}>{step < STEPS.length - 1 ? "Lanjut" : saving ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Simpan dan lihat rekomendasi"}</Button>
          {isEdit && (
            <ConfirmButton title="Hapus usaha ini?" message="Semua omzet, karyawan, rekomendasi, dan riwayat hitungan usaha ini ikut terhapus." confirmLabel="Hapus usaha"
              onConfirm={handleDelete} className="ml-auto text-sm font-semibold text-due underline-offset-4 hover:underline">
              Hapus usaha
            </ConfirmButton>
          )}
        </div>
      </form>
    </>
  );
}
