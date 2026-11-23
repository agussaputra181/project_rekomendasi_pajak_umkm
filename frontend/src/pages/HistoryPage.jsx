// Riwayat perhitungan (SRS FR-020) dengan filter jenis pajak & pagination.
import { useState } from "react";
import { Link } from "react-router-dom";
import useApi from "../hooks/useApi";
import useCurrentBusiness from "../hooks/useCurrentBusiness";
import { Alert, Empty, Loading, PageTitle, Pagination, Select } from "../components/ui";
import { CALC_LABEL, MONTHS, formatDateTime, formatRupiah } from "../utils/format";

export default function HistoryPage() {
  const { business, guard } = useCurrentBusiness();
  const [taxType, setTaxType] = useState("");
  const [page, setPage] = useState(1);
  const { data, pagination, loading, error } = useApi(business ? `/businesses/${business._id}/calculations` : null, { taxType: taxType || undefined, page, limit: 10 });

  if (guard) return guard;

  return (
    <>
      <PageTitle
        note="Setiap hasil menyimpan data masukan dan versi aturan yang dipakai, sehingga tidak berubah walau aturan diperbarui."
        aside={
          <label className="flex items-center gap-2 text-sm">Jenis
            <span className="w-52"><Select value={taxType} onChange={(e) => { setTaxType(e.target.value); setPage(1); }}>
              <option value="">Semua</option>
              {Object.entries(CALC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select></span>
          </label>
        }
      >
        Riwayat hitungan
      </PageTitle>

      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : data.length === 0 ? (
        <Empty>Belum ada perhitungan. <Link to="/hitung" className="font-semibold text-tosca-dark underline">Buka kalkulator</Link></Empty>
      ) : (
        <>
          <ul className="space-y-3">
            {data.map((c) => (
              <li key={c._id}>
                <details className="rounded-md bg-white ring-1 ring-line">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <span>
                      <span className="font-bold">{CALC_LABEL[c.taxType]}</span>
                      <span className="ml-2 text-sm text-ink-soft">{c.period?.month ? `${MONTHS[c.period.month - 1]} ` : "Tahun "}{c.period?.year}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-lg font-extrabold">{formatRupiah(Math.abs(c.result.payable))}</span>
                      <span className="block text-xs text-ink-soft">{formatDateTime(c.createdAt)}</span>
                    </span>
                  </summary>
                  <div className="border-t border-line px-5 py-4 text-sm">
                    <ol className="list-decimal space-y-1 pl-5 text-ink-soft">{c.result.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                    {c.input?.ruleVersions && (
                      <p className="mt-3 text-xs text-ink-soft">Versi aturan: {Object.entries(c.input.ruleVersions).map(([k, v]) => `${k} v${v}`).join(", ")}</p>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}
    </>
  );
}

