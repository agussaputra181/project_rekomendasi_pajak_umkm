// Ringkasan kewajiban pajak tahunan untuk persiapan SPT Tahunan (SRS FR-020).
// Tombol "Unduh PDF" membuka dialog cetak browser; pilih "Simpan sebagai PDF".
import { useState } from "react";
import useApi from "../hooks/useApi";
import useCurrentBusiness from "../hooks/useCurrentBusiness";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Loading, PageTitle, Select, td, th } from "../components/ui";
import { ENTITY_LABEL, MONTHS, SECTOR_LABEL, TAX_LABEL, formatDate, formatRupiah } from "../utils/format";

const thisYear = new Date().getFullYear();

export default function AnnualSummaryPage() {
  const { business, guard } = useCurrentBusiness();
  const { user } = useAuth();
  const [year, setYear] = useState(thisYear);
  const dashboard = useApi(business ? `/dashboard/umkm/${business._id}` : null, { year });
  const rec = useApi(business ? `/businesses/${business._id}/recommendations/latest` : null);
  const deadlines = useApi(business ? `/businesses/${business._id}/deadlines` : null, { year });
  const history = useApi(business ? `/businesses/${business._id}/calculations` : null, { year, limit: 100 });

  if (guard) return guard;
  const loading = dashboard.loading || rec.loading || deadlines.loading || history.loading;
  const error = dashboard.error || rec.error || deadlines.error || history.error;
  if (loading && !dashboard.data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!dashboard.data || !rec.data || !deadlines.data || !history.data) return <Loading />;

  const d = dashboard.data;
  const totalFinal = d.revenue.months.reduce((s, m) => s + (m.estimatedTax || 0), 0);
  const annual = deadlines.data.events.find((e) => e.key === `SPT-TAHUNAN-${year}`);
  const pph21 = history.data.filter((c) => c.taxType === "PPH21");

  return (
    <>
      <div className="no-print">
        <PageTitle
          note="Bawa ringkasan ini saat mengisi SPT Tahunan atau berkonsultasi dengan pendamping pajak."
          aside={
            <div className="flex items-end gap-3">
              <label className="text-sm">Tahun pajak
                <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>{[thisYear - 1, thisYear].map((y) => <option key={y}>{y}</option>)}</Select>
              </label>
              <Button onClick={() => window.print()}>Unduh PDF</Button>
            </div>
          }
        >
          Ringkasan tahunan
        </PageTitle>
        <p className="mb-6 text-sm text-ink-soft">Di jendela cetak, pilih tujuan <strong>Simpan sebagai PDF</strong>.</p>
      </div>

      <article className="rounded-md bg-white p-8 ring-1 ring-line print:p-0 print:ring-0">
        <header className="border-b-4 border-double border-ink pb-4">
          <p className="text-sm text-ink-soft">Ringkasan kewajiban pajak tahun {year}</p>
          <h2 className="text-2xl font-extrabold">{business.businessName}</h2>
          <p className="text-sm">{ENTITY_LABEL[business.entityType]}, {SECTOR_LABEL[business.sector]}. Pemilik: {user.name}. NPWP: {business.npwp || "belum ada"}</p>
        </header>

        <section className="mt-6">
          <h3 className="font-bold">Kewajiban pajak</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {rec.data.items.filter((i) => i.applicable).map((i) => <li key={i._id}><strong>{TAX_LABEL[i.taxType] || i.taxType}</strong>: {i.reason}</li>)}
          </ul>
        </section>

        <section className="mt-6">
          <h3 className="font-bold">Omzet dan estimasi PPh Final per bulan</h3>
          <table className="mt-2 w-full text-sm">
            <thead><tr><th className={th}>Bulan</th><th className={`${th} text-right`}>Omzet</th><th className={`${th} text-right`}>Estimasi PPh Final</th></tr></thead>
            <tbody className="divide-y divide-line">
              {d.revenue.months.map((m) => (
                <tr key={m.month}><td className={td}>{MONTHS[m.month - 1]}</td><td className={`${td} text-right`}>{m.amount === null ? "belum dicatat" : formatRupiah(m.amount)}</td><td className={`${td} text-right`}>{m.estimatedTax === null ? "-" : formatRupiah(m.estimatedTax)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-ink font-bold"><td className={td}>Total</td><td className={`${td} text-right`}>{formatRupiah(d.revenue.cumulative)}</td><td className={`${td} text-right`}>{formatRupiah(totalFinal)}</td></tr></tfoot>
          </table>
          <p className="mt-2 text-xs text-ink-soft">Omzet gabungan (dengan usaha lain & pasangan): {formatRupiah(d.revenue.combined)}.</p>
        </section>

        {pph21.length > 0 && (
          <section className="mt-6">
            <h3 className="font-bold">PPh 21 yang sudah dihitung</h3>
            <ul className="mt-2 text-sm">{pph21.map((c) => <li key={c._id}>{MONTHS[c.period.month - 1]}: {formatRupiah(c.result.payable)}</li>)}</ul>
          </section>
        )}

        <section className="mt-6">
          <h3 className="font-bold">Checklist saran</h3>
          <p className="text-sm">{d.checklist.done} dari {d.checklist.total} langkah sudah dikerjakan.</p>
        </section>

        {annual && (
          <p className="mt-6 border-t border-line pt-4 text-sm">
            Batas lapor SPT Tahunan: <strong>{formatDate(annual.dueDate)}</strong>.
          </p>
        )}
        <p className="mt-6 text-xs text-ink-soft">Dicetak dari Sistem Rekomendasi Pajak UMKM pada {formatDate(new Date())}. Estimasi edukatif, bukan pengganti SPT resmi.</p>
      </article>
    </>
  );
}
