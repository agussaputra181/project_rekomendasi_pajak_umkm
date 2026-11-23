// Kalkulator pajak (SRS FR-009 s.d. FR-013): PPh Final, PPh Badan, PPh 21, perbandingan skema, PPN.
// Setiap hasil tersimpan di riwayat bersama versi aturan yang dipakai.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { getErrorMessage, getFieldErrors } from "../api/client";
import useCurrentBusiness from "../hooks/useCurrentBusiness";
import Term from "../components/Term";
import { Alert, Button, Checkbox, Field, MoneyInput, Nota, PageTitle, Panel, Select, TabPanel, Tabs, td, th } from "../components/ui";
import { MONTHS, PTKP_OPTIONS, formatRupiah } from "../utils/format";

const TABS = [
  { key: "final", label: "PPh Final 0,5%" },
  { key: "badan", label: "PPh Badan" },
  { key: "pph21", label: "PPh 21 karyawan" },
  { key: "compare", label: "Perbandingan skema" },
  { key: "ppn", label: "PPN" },
];
const thisYear = new Date().getFullYear();
const lastMonth = Math.max(1, new Date().getMonth()); // bulan lalu (1-12)
const pct = (r) => `${((r || 0) * 100).toLocaleString("id-ID")}%`;

// Pembungkus: kirim ke endpoint, tampilkan error & hasil
function useCalculation(endpoint) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  async function run(body) {
    setBusy(true);
    setError("");
    setFieldErrors({});
    setResult(null);
    try {
      const res = await api.post(`/calculations/${endpoint}`, body);
      setResult(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus(err.response?.status);
      setFieldErrors(getFieldErrors(err));
    } finally {
      setBusy(false);
    }
  }
  return { result, error, status, fieldErrors, busy, run };
}

function PeriodFields({ year, month, onYear, onMonth, withMonth = true }) {
  return (
    <>
      <Field label="Tahun"><Select value={year} onChange={(e) => onYear(Number(e.target.value))}>{[thisYear - 1, thisYear].map((y) => <option key={y}>{y}</option>)}</Select></Field>
      {withMonth && <Field label="Bulan (masa pajak)"><Select value={month} onChange={(e) => onMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Field>}
    </>
  );
}

function FinalTab({ business }) {
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(lastMonth);
  const calc = useCalculation("pph-final");
  const r = calc.result?.result;
  const input = calc.result?.input;
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <Panel>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); calc.run({ businessId: business._id, year, month }); }}>
          <PeriodFields year={year} month={month} onYear={setYear} onMonth={setMonth} />
          <p className="text-xs text-ink-soft">Omzet dan PPh 22 diambil dari catatan omzet bulan tersebut.</p>
          <Button disabled={calc.busy} className="w-full">{calc.busy ? "Menghitung…" : "Hitung"}</Button>
        </form>
      </Panel>
      <div>
        {calc.error && (
          <Alert type={calc.status === 422 ? "warning" : "error"}>
            {calc.error}{" "}
            {calc.status === 404 && <Link to="/omzet" className="underline">Catat omzet</Link>}
          </Alert>
        )}
        {r && (
          <Nota title={`PPh Final masa ${MONTHS[month - 1]} ${year}`} subtitle={`Tarif ${pct(r.rate)} dari omzet`}
            lines={[
              ["Omzet bulan ini", formatRupiah(input.monthRevenue)],
              ["Omzet sebelumnya tahun ini", formatRupiah(input.cumulativeBefore)],
              ["Bagian bebas (orang pribadi)", formatRupiah(r.deduction)],
              [<Term key="d" word="DPP" label="DPP (omzet kena pajak)" />, formatRupiah(r.dpp), true],
              ["PPh terutang", formatRupiah(r.taxDue)],
              [<Term key="p" word="PPh 22" label="PPh 22 sudah dipungut" />, `- ${formatRupiah(r.credit)}`],
            ]}
            totalLabel="Sisa yang disetor sendiri" totalNote="Paling lambat tanggal 15 bulan berikutnya" total={formatRupiah(r.payable)} steps={r.steps} />
        )}
      </div>
    </div>
  );
}

function BadanTab({ business }) {
  const [year, setYear] = useState(thisYear);
  const [form, setForm] = useState({ annualRevenue: "", pkp: "", credits: "" });
  const calc = useCalculation("pph-badan");
  const r = calc.result?.result;
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <Panel>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); calc.run({ businessId: business._id, year, ...form }); }}>
          <PeriodFields year={year} onYear={setYear} withMonth={false} />
          <Field label="Omzet setahun" hint="Kosongkan untuk memakai omzet tercatat/perkiraan."><MoneyInput value={form.annualRevenue} onChange={(v) => setForm({ ...form, annualRevenue: v })} /></Field>
          <Field label={<Term word="PKP_PPH" label="Penghasilan Kena Pajak (laba fiskal)" />} error={calc.fieldErrors.pkp}><MoneyInput value={form.pkp} onChange={(v) => setForm({ ...form, pkp: v })} required /></Field>
          <Field label="Kredit pajak (PPh 25, PPh 22, PPh 23 yang sudah dibayar/dipotong)"><MoneyInput value={form.credits} onChange={(v) => setForm({ ...form, credits: v })} /></Field>
          <Button disabled={calc.busy} className="w-full">{calc.busy ? "Menghitung…" : "Hitung"}</Button>
        </form>
      </Panel>
      <div>
        <Alert type={calc.status === 422 ? "warning" : "error"}>{calc.error}</Alert>
        {r && (
          <Nota title={`PPh Badan tahun pajak ${year}`} subtitle="Tarif 22% dengan fasilitas Pasal 31E"
            lines={[["PKP", formatRupiah(r.dpp)], ["PKP yang mendapat fasilitas", formatRupiah(r.facilityPkp)], ["PPh terutang", formatRupiah(r.taxDue), true], ["Kredit pajak", `- ${formatRupiah(r.credit)}`]]}
            totalLabel={r.payable >= 0 ? "Kurang bayar (PPh 29)" : "Lebih bayar"} totalNote="Disetor sebelum lapor SPT Tahunan Badan (30 April)" total={formatRupiah(Math.abs(r.payable))} steps={r.steps} />
        )}
      </div>
    </div>
  );
}

function Pph21Tab({ business }) {
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(lastMonth);
  const calc = useCalculation("pph21");
  const r = calc.result?.result;
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <Panel>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); calc.run({ businessId: business._id, year, month }); }}>
          <PeriodFields year={year} month={month} onYear={setYear} onMonth={setMonth} />
          <p className="text-xs text-ink-soft">Januari-November memakai TER. Desember menghitung ulang setahun dengan tarif Pasal 17 untuk pegawai tetap.</p>
          <Button disabled={calc.busy} className="w-full">{calc.busy ? "Menghitung…" : "Hitung"}</Button>
        </form>
      </Panel>
      <div>
        {calc.error && <Alert>{calc.error} <Link to="/karyawan" className="underline">Kelola karyawan</Link></Alert>}
        {r && (
          <Nota title={`PPh 21 masa ${MONTHS[month - 1]} ${year}`} subtitle={month === 12 ? "Penghitungan ulang Desember" : "Tarif efektif rata-rata (TER)"}
            totalLabel="Total PPh 21 dipotong" totalNote="Setor tanggal 15, lapor tanggal 20 bulan berikutnya" total={formatRupiah(r.payable)} steps={r.steps}>
            <div className="overflow-x-auto px-6 pt-4">
              <table className="w-full text-sm">
                <thead><tr><th className={th}>Karyawan</th><th className={th}>Kategori</th><th className={th}>Tarif</th><th className={`${th} text-right`}>PPh 21</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.rows.map((row) => (
                    <tr key={row.name}><td className={td}>{row.name}</td><td className={td}>TER {row.category}</td><td className={td}>{row.rate === null ? "Pasal 17" : pct(row.rate)}</td><td className={`${td} text-right`}>{row.tax < 0 ? `lebih potong ${formatRupiah(-row.tax)}` : formatRupiah(row.tax)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Nota>
        )}
      </div>
    </div>
  );
}

function CompareTab({ business }) {
  const [year, setYear] = useState(thisYear);
  const [form, setForm] = useState({ annualRevenue: "", netIncome: "", ptkpStatus: "TK/0" });
  const calc = useCalculation("compare-scheme");
  const r = calc.result?.result;
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <Panel>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); calc.run({ businessId: business._id, year, ...form }); }}>
          <PeriodFields year={year} onYear={setYear} withMonth={false} />
          <Field label="Omzet setahun" hint="Kosongkan untuk memakai omzet tercatat/perkiraan."><MoneyInput value={form.annualRevenue} onChange={(v) => setForm({ ...form, annualRevenue: v })} /></Field>
          <Field label="Perkiraan penghasilan neto (laba) setahun" error={calc.fieldErrors.netIncome}><MoneyInput value={form.netIncome} onChange={(v) => setForm({ ...form, netIncome: v })} required /></Field>
          {business.entityType === "OP" && (
            <Field label="Status PTKP pemilik"><Select value={form.ptkpStatus} onChange={(e) => setForm({ ...form, ptkpStatus: e.target.value })}>{PTKP_OPTIONS.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          )}
          <Button disabled={calc.busy} className="w-full">{calc.busy ? "Menghitung…" : "Bandingkan"}</Button>
        </form>
      </Panel>
      <div>
        <Alert>{calc.error}</Alert>
        {r && (
          <>
            {!r.eligibleForFinal && <Alert type="warning">Usaha ini tidak memenuhi syarat PPh Final. Perbandingan ini hanya simulasi; yang berlaku adalah skema umum.</Alert>}
            <div className="grid gap-4 md:grid-cols-2">
              {[["Skema PPh Final 0,5%", r.final, "final"], [business.entityType === "OP" ? "Skema umum (Pasal 17)" : "Skema umum (PPh Badan)", r.general, "umum"]].map(([title, part, key]) => (
                <div key={key} className={`rounded-md bg-white p-6 ring-1 ${r.cheaper === key ? "ring-2 ring-tosca" : "ring-line"}`}>
                  <p className="font-bold">{title}</p>
                  <p className="mt-2 text-3xl font-extrabold">{formatRupiah(part.tax)}</p>
                  {r.cheaper === key && <p className="mt-1 text-sm font-semibold text-tosca-dark">Lebih ringan {formatRupiah(r.difference)}</p>}
                  <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink-soft">{part.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-soft">Simulasi setahun. Pilihan skema mengikuti syarat aturan, bukan mana yang lebih murah.</p>
          </>
        )}
      </div>
    </div>
  );
}

function PpnTab({ business }) {
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(lastMonth);
  const [form, setForm] = useState({ sales: "", inputVat: "", isLuxury: false });
  const calc = useCalculation("ppn");
  const r = calc.result?.result;
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <Panel>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); calc.run({ businessId: business._id, year, month, ...form }); }}>
          <PeriodFields year={year} month={month} onYear={setYear} onMonth={setMonth} />
          <Field label="Penjualan (harga jual, belum termasuk PPN)" error={calc.fieldErrors.sales}><MoneyInput value={form.sales} onChange={(v) => setForm({ ...form, sales: v })} required /></Field>
          <Field label="PPN masukan (dari faktur pembelian)"><MoneyInput value={form.inputVat} onChange={(v) => setForm({ ...form, inputVat: v })} /></Field>
          <Checkbox label="Barang mewah (PPnBM)" hint="Barang mewah: DPP = harga jual penuh" checked={form.isLuxury} onChange={(e) => setForm({ ...form, isLuxury: e.target.checked })} />
          <Button disabled={calc.busy} className="w-full">{calc.busy ? "Menghitung…" : "Hitung"}</Button>
        </form>
        {!business.isPKP && <p className="mt-4 text-xs text-ink-soft">Usaha Anda belum <Term word="PKP" />. Hasil ini hanya simulasi.</p>}
      </Panel>
      <div>
        <Alert>{calc.error}</Alert>
        {r && (
          <Nota title={`PPN masa ${MONTHS[month - 1]} ${year}`} subtitle="PPN 12% x DPP nilai lain 11/12 (PMK 131/2024)"
            lines={[["DPP", formatRupiah(r.dpp)], ["PPN keluaran", formatRupiah(r.taxDue), true], ["PPN masukan", `- ${formatRupiah(r.credit)}`]]}
            totalLabel={r.payable >= 0 ? "PPN yang disetor" : "Lebih bayar"} totalNote="Setor & lapor paling lambat akhir bulan berikutnya" total={formatRupiah(Math.abs(r.payable))} steps={r.steps} />
        )}
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  const { business, guard } = useCurrentBusiness();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "final";
  if (guard) return guard;
  const panels = { final: FinalTab, badan: BadanTab, pph21: Pph21Tab, compare: CompareTab, ppn: PpnTab };
  const Current = panels[tab];
  return (
    <>
      <PageTitle note="Hasil berupa estimasi edukatif dan tersimpan di Riwayat hitungan beserta versi aturan yang dipakai.">Kalkulator pajak</PageTitle>
      <Tabs label="Jenis perhitungan" items={TABS} value={tab} onChange={(key) => setParams({ tab: key }, { replace: true })} />
      <TabPanel tabKey={tab}><Current key={`${tab}-${business._id}`} business={business} /></TabPanel>
    </>
  );
}
