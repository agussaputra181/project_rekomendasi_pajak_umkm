// Dashboard monitoring (SRS FR-019): jumlah UMKM per bentuk usaha & per kewajiban, UMKM berisiko
// (mendekati/melewati batas atau belum mencatat omzet), dan persentase saran yang dijalankan.
import { useState } from "react";
import { Link } from "react-router-dom";
import useApi from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import BarList from "../../components/BarList";
import { Alert, Checkbox, Empty, Loading, PageTitle, Panel, Progress, Section, Select, td, th } from "../../components/ui";
import { ENTITY_LABEL, MONTHS, TAX_LABEL, formatRupiahShort, percent } from "../../utils/format";

const thisYear = new Date().getFullYear();
const FLAG_LABEL = { mendekati_batas: "Mendekati batas", melewati_batas: "Melewati batas", belum_catat_omzet: "Belum catat omzet bulan lalu" };

export default function MonitoringPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(thisYear);
  const [riskyOnly, setRiskyOnly] = useState(false);
  const { data, loading, error } = useApi("/dashboard/monitoring", { year });

  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  const rows = riskyOnly ? data.risky : data.rows;

  return (
    <>
      <PageTitle
        note={user.role === "pendamping" ? "UMKM yang ditetapkan Admin sebagai binaan Anda." : "Seluruh UMKM yang terdaftar di sistem."}
        aside={<label className="flex items-center gap-2 text-sm">Tahun<span className="w-28"><Select value={year} onChange={(e) => setYear(Number(e.target.value))}>{[thisYear - 1, thisYear].map((y) => <option key={y}>{y}</option>)}</Select></span></label>}
      >
        {user.role === "pendamping" ? "Pantauan UMKM binaan" : "Pantauan semua UMKM"}
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel><p className="text-sm text-ink-soft">Jumlah usaha</p><p className="mt-1 text-3xl font-extrabold">{data.totals.businesses}</p></Panel>
        <Panel><p className="text-sm text-ink-soft">Perlu perhatian</p><p className="mt-1 text-3xl font-extrabold text-due">{data.totals.atRisk}</p></Panel>
        <Panel>
          <p className="text-sm text-ink-soft">Saran yang sudah dijalankan</p>
          <p className="mt-1 text-3xl font-extrabold">{percent(data.actionProgress.percent)}</p>
          <div className="mt-2"><Progress value={data.actionProgress.percent} label="Persentase saran dijalankan" /></div>
          <p className="mt-1 text-xs text-ink-soft">{data.actionProgress.done} dari {data.actionProgress.total} langkah</p>
        </Panel>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <Section title="UMKM per bentuk usaha">
          <BarList rows={data.byEntityType} labelOf={(r) => ENTITY_LABEL[r.entityType] || r.entityType} />
        </Section>
        <Section title="UMKM per jenis kewajiban">
          <BarList rows={data.byObligation} labelOf={(r) => TAX_LABEL[r.taxType] || r.taxType} />
        </Section>
      </div>

      <Section title="Daftar usaha" className="mt-10" aside={<Checkbox label="Hanya yang perlu perhatian" checked={riskyOnly} onChange={(e) => setRiskyOnly(e.target.checked)} />}>
        {rows.length === 0 ? <Empty>{riskyOnly ? "Tidak ada usaha yang perlu perhatian." : user.role === "pendamping" ? "Belum ada UMKM binaan. Hubungi Admin untuk ditetapkan sebagai pendamping." : "Belum ada usaha terdaftar."}</Empty> : (
          <div className="overflow-x-auto rounded-md bg-white p-5 ring-1 ring-line">
            <table className="w-full min-w-[48rem] text-sm">
              <thead><tr><th className={th}>Usaha</th><th className={th}>Bentuk</th><th className={`${th} text-right`}>Omzet {year}</th><th className={th}>Dari batas</th><th className={th}>Omzet terakhir</th><th className={th}>Saran</th><th className={th}>Perhatian</th></tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.businessId}>
                    <td className={td}><Link to={`/pantauan/${r.businessId}`} className="font-semibold text-tosca-dark underline-offset-4 hover:underline">{r.businessName}</Link><span className="block text-xs text-ink-soft">{r.owner?.name}</span></td>
                    <td className={td}>{ENTITY_LABEL[r.entityType]}</td>
                    <td className={`${td} text-right`}>{formatRupiahShort(r.revenueTotal)}</td>
                    <td className={td}>{percent(r.percentOfLimit)} dari {formatRupiahShort(r.limit)}</td>
                    <td className={td}>{r.lastRecordedMonth ? MONTHS[r.lastRecordedMonth - 1] : "-"}</td>
                    <td className={td}>{percent(r.actions.percent)}</td>
                    <td className={td}>{r.flags.length ? r.flags.map((f) => <span key={f} className="block font-semibold text-due">{FLAG_LABEL[f]}</span>) : <span className="text-ok">Aman</span>}</td>
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
