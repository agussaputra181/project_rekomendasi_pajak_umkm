// Dashboard UMKM (SRS FR-018): status skema pajak, progres omzet menuju batas, estimasi pajak,
// jatuh tempo terdekat, progres checklist saran, dan grafik omzet bulanan.
import { useState } from "react";
import { Link } from "react-router-dom";
import useApi from "../hooks/useApi";
import useCurrentBusiness from "../hooks/useCurrentBusiness";
import RevenueChart from "../components/RevenueChart";
import ThresholdRuler from "../components/ThresholdRuler";
import Term from "../components/Term";
import { Alert, Loading, PageTitle, Panel, Progress, Section, Select } from "../components/ui";
import { ENTITY_LABEL, MONTHS, TAX_LABEL, formatDate, formatRupiah, percent } from "../utils/format";

const thisYear = new Date().getFullYear();

export default function DashboardPage() {
  const { business, guard } = useCurrentBusiness();
  const [year, setYear] = useState(thisYear);
  const { data, loading, error } = useApi(business ? `/dashboard/umkm/${business._id}` : null, { year });

  if (guard) return guard;
  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!data) return null;

  const { scheme, revenue, thresholds, estimatedTax, nextDeadline, upcomingDeadlines, checklist } = data;
  const latest = estimatedTax.latestMonth;

  return (
    <>
      <PageTitle
        note={`${ENTITY_LABEL[business.entityType]}. Ringkasan tahun ${year}.`}
        aside={
          <label className="flex items-center gap-2 text-sm">
            Tahun
            <span className="w-28"><Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear - 1, thisYear].map((y) => <option key={y}>{y}</option>)}
            </Select></span>
          </label>
        }
      >
        {business.businessName}
      </PageTitle>

      {/* Kalimat status: hal pertama yang dibaca pengguna */}
      <p className="mb-10 max-w-3xl text-xl leading-relaxed">
        Skema pajak usaha Anda: <strong>{scheme.label}</strong>
        {scheme.note && <span className="text-ink-soft"> ({scheme.note.toLowerCase()})</span>}.{" "}
        {nextDeadline ? (
          <>Batas terdekat <strong>{formatDate(nextDeadline.dueDate)}</strong>: {nextDeadline.title}.</>
        ) : (
          <>Belum ada jatuh tempo dalam waktu dekat.</>
        )}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <p className="text-sm text-ink-soft">Omzet tercatat {year}</p>
          <p className="mt-1 text-2xl font-extrabold">{formatRupiah(revenue.cumulative)}</p>
          <p className="mt-1 text-sm text-ink-soft">{revenue.monthsRecorded} dari 12 bulan dicatat</p>
        </Panel>
        <Panel>
          <p className="text-sm text-ink-soft">Estimasi <Term word="PPh Final" /> bulan {latest ? MONTHS[latest.month - 1] : "terakhir"}</p>
          <p className="mt-1 text-2xl font-extrabold">{estimatedTax.pphFinal === null ? "-" : formatRupiah(estimatedTax.pphFinal)}</p>
          {estimatedTax.pph21 !== null && <p className="mt-1 text-sm text-ink-soft">PPh 21 karyawan: {formatRupiah(estimatedTax.pph21)}</p>}
        </Panel>
        <Panel>
          <p className="text-sm text-ink-soft">Checklist saran selesai</p>
          <p className="mt-1 text-2xl font-extrabold">{checklist.done} dari {checklist.total}</p>
          <div className="mt-3"><Progress value={checklist.percent} label="Progres checklist saran" /></div>
          <Link to="/rekomendasi" className="mt-3 inline-block text-sm font-semibold text-tosca-dark underline-offset-4 hover:underline">Lihat saran</Link>
        </Panel>
      </div>

      <Section title="Progres omzet menuju batas" className="mt-10">
        <div className="space-y-6">
          {thresholds.map((t) => (
            <div key={t.key}>
              <p className="mb-2 text-sm text-ink-soft">
                {t.key === "ceiling" ? <>Omzet gabungan terhadap batas PPh Final dan <Term word="PKP" /></> : "Omzet tahun ini terhadap batas bebas orang pribadi"} ({percent(t.percent)})
              </p>
              <ThresholdRuler value={t.value} limit={t.limit} label={t.key === "ceiling" ? "Batas" : "Batas bebas"} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Omzet dan estimasi PPh Final per bulan" className="mt-6" aside={<Link to="/omzet" className="text-sm font-semibold text-tosca-dark underline-offset-4 hover:underline">Catat omzet</Link>}>
        <Panel><RevenueChart months={revenue.months} /></Panel>
      </Section>

      <Section title="Jatuh tempo berikutnya" className="mt-6" aside={<Link to="/jadwal" className="text-sm font-semibold text-tosca-dark underline-offset-4 hover:underline">Lihat kalender</Link>}>
        {upcomingDeadlines.length === 0 ? (
          <p className="text-sm text-ink-soft">Tidak ada jatuh tempo lagi tahun ini.</p>
        ) : (
          <ul className="divide-y divide-line rounded-md bg-white ring-1 ring-line">
            {upcomingDeadlines.map((e) => (
              <li key={e.key} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
                <span>{e.title} <span className="text-ink-soft">({TAX_LABEL[e.taxType] || e.taxType})</span></span>
                <span className="font-semibold">{formatDate(e.dueDate)}{e.shifted && <span className="font-normal text-ink-soft"> (digeser dari hari libur)</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
