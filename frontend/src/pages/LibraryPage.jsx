// Pustaka: pencarian & filter regulasi (SRS FR-015) dan artikel edukasi (FR-016).
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useApi from "../hooks/useApi";
import { Alert, Button, Empty, Input, Loading, PageTitle, Pagination, Select, TabPanel, Tabs } from "../components/ui";
import { AFFECTED_TAX_OPTIONS, ARTICLE_CATEGORY_LABEL, REG_STATUS_LABEL, REG_TYPE_LABEL, formatDate } from "../utils/format";

const STATUS_STYLE = { berlaku: "text-ok", diubah: "text-warn", dicabut: "text-due" };

function SearchBox({ value, onSearch, placeholder }) {
  const [text, setText] = useState(value);
  return (
    <form role="search" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onSearch(text.trim()); }}>
      <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <Button>Cari</Button>
    </form>
  );
}

function Regulations() {
  const [filters, setFilters] = useState({ q: "", taxType: "", status: "", type: "", sort: "-effectiveDate", page: 1 });
  const params = Object.fromEntries(Object.entries({ ...filters, limit: 10 }).filter(([, v]) => v !== ""));
  const { data, pagination, loading, error } = useApi("/regulations", params);
  const update = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page || 1 }));

  return (
    <>
      <div className="mb-4"><SearchBox value={filters.q} onSearch={(q) => update({ q })} placeholder="Cari regulasi, misalnya marketplace atau PPh final" /></div>
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Select aria-label="Jenis pajak" value={filters.taxType} onChange={(e) => update({ taxType: e.target.value })}>
          <option value="">Semua jenis pajak</option>{AFFECTED_TAX_OPTIONS.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Semua status</option>{Object.entries(REG_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select aria-label="Jenis aturan" value={filters.type} onChange={(e) => update({ type: e.target.value })}>
          <option value="">Semua jenis aturan</option>{Object.entries(REG_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select aria-label="Urutkan" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
          <option value="-effectiveDate">Terbaru berlaku</option>
          <option value="effectiveDate">Terlama berlaku</option>
          <option value="title">Judul A-Z</option>
          <option value="-title">Judul Z-A</option>
          {filters.q && <option value="">Paling relevan</option>}
        </Select>
      </div>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : data.length === 0 ? <Empty>Tidak ada regulasi yang cocok. Coba kata kunci lain.</Empty> : (
        <>
          <ul className="divide-y divide-line rounded-md bg-white ring-1 ring-line">
            {data.map((r) => (
              <li key={r._id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link to={`/pustaka/regulasi/${r._id}`} className="font-bold text-ink underline-offset-4 hover:underline">{r.number}: {r.title}</Link>
                  <span className={`text-sm font-semibold ${STATUS_STYLE[r.status]}`}>{REG_STATUS_LABEL[r.status]}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{r.summaryPlain}</p>
                <p className="mt-1 text-xs text-ink-soft">Berlaku {formatDate(r.effectiveDate)}{r.affectedTaxTypes?.length ? `, ${r.affectedTaxTypes.join(", ")}` : ""}</p>
              </li>
            ))}
          </ul>
          <Pagination pagination={pagination} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      )}
    </>
  );
}

function Articles() {
  const [filters, setFilters] = useState({ q: "", category: "", page: 1 });
  const params = Object.fromEntries(Object.entries({ ...filters, limit: 12 }).filter(([, v]) => v !== ""));
  const { data, pagination, loading, error } = useApi("/articles", params);
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <SearchBox value={filters.q} onSearch={(q) => setFilters({ ...filters, q, page: 1 })} placeholder="Cari istilah atau panduan, misalnya PKP" />
        <Select aria-label="Kategori" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}>
          <option value="">Semua kategori</option>{Object.entries(ARTICLE_CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : data.length === 0 ? <Empty>Tidak ada artikel yang cocok.</Empty> : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.map((a) => (
              <li key={a._id} className="rounded-md bg-white p-5 ring-1 ring-line">
                <p className="text-xs font-semibold text-tosca-dark">{ARTICLE_CATEGORY_LABEL[a.category]}</p>
                <Link to={`/pustaka/artikel/${a.slug}`} className="mt-1 block font-bold underline-offset-4 hover:underline">{a.title}</Link>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{a.content.split("\n")[0]}</p>
              </li>
            ))}
          </ul>
          <Pagination pagination={pagination} onChange={(page) => setFilters({ ...filters, page })} />
        </>
      )}
    </>
  );
}

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "artikel" ? "artikel" : "regulasi";
  return (
    <>
      <PageTitle note="Cari aturan pajak dan penjelasan istilah dalam bahasa sehari-hari.">Pustaka pajak</PageTitle>
      <Tabs label="Isi pustaka" value={tab} onChange={(key) => setParams({ tab: key }, { replace: true })}
        items={[{ key: "regulasi", label: "Regulasi" }, { key: "artikel", label: "Glosarium, panduan & tanya jawab" }]} />
      <TabPanel tabKey={tab}>{tab === "regulasi" ? <Regulations /> : <Articles />}</TabPanel>
    </>
  );
}
