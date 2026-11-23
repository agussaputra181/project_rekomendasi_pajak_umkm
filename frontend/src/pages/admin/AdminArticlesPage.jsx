// Kelola artikel edukasi (SRS FR-016, FR-017): glosarium, panduan, FAQ, berita aturan.
import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage, getFieldErrors } from "../../api/client";
import useApi from "../../hooks/useApi";
import { useToast } from "../../context/ToastContext";
import { Alert, Button, Checkbox, ConfirmButton, Field, Input, Loading, PageTitle, Pagination, Panel, Select, Textarea, td, th } from "../../components/ui";
import { ARTICLE_CATEGORY_LABEL, formatDate } from "../../utils/format";

const EMPTY = { title: "", slug: "", category: "panduan", content: "", tags: "", regulationIds: [], isPublished: false };

export default function AdminArticlesPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const { data, pagination, loading, error, reload } = useApi("/articles", { all: true, page, limit: 10, category: category || undefined });
  const regulations = useApi("/regulations", { limit: 100, sort: "title" });
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function edit(a) {
    setForm({ ...EMPTY, ...a, tags: (a.tags || []).join(", "), regulationIds: (a.regulationIds || []).map((r) => r._id || r) });
    setFormError("");
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e) {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    const payload = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    if (!payload.slug) delete payload.slug; // dibuat otomatis dari judul
    try {
      if (form._id) await api.put(`/articles/${form._id}`, payload);
      else await api.post("/articles", payload);
      toast("Artikel tersimpan");
      setForm(null);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    }
  }

  async function remove(a) {
    try {
      await api.delete(`/articles/${a._id}`);
      toast("Artikel dihapus");
      reload();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  return (
    <>
      <PageTitle note="Tulis dalam bahasa sehari-hari. Pisahkan paragraf dengan baris kosong. Tag HTML berbahaya dibersihkan otomatis." aside={<Button onClick={() => edit(EMPTY)}>Tulis artikel</Button>}>Artikel edukasi</PageTitle>

      {form && (
        <Panel className="mb-8">
          <h2 className="mb-4 font-bold">{form._id ? "Ubah artikel" : "Artikel baru"}</h2>
          <Alert>{formError}</Alert>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
              <Field label="Judul" error={fieldErrors.title}><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
              <Field label="Kategori"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(ARTICLE_CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            </div>
            <Field label="Alamat (slug)" hint="Kosongkan agar dibuat otomatis dari judul" error={fieldErrors.slug}><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            <Field label="Isi" error={fieldErrors.content}><Textarea className="min-h-64" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required /></Field>
            <Field label="Kata kunci (pisahkan dengan koma)"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Regulasi terkait</legend>
              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md p-3 ring-1 ring-line sm:grid-cols-3">
                {(regulations.data || []).map((r) => (
                  <Checkbox key={r._id} label={r.number} checked={form.regulationIds.includes(r._id)}
                    onChange={() => setForm({ ...form, regulationIds: form.regulationIds.includes(r._id) ? form.regulationIds.filter((x) => x !== r._id) : [...form.regulationIds, r._id] })} />
                ))}
              </div>
            </fieldset>
            <Checkbox label="Terbitkan (tampil untuk pengguna)" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            <div className="flex gap-3"><Button>Simpan</Button><Button type="button" variant="quiet" onClick={() => setForm(null)}>Batal</Button></div>
          </form>
        </Panel>
      )}

      <div className="mb-4 max-w-xs">
        <Select aria-label="Kategori" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">Semua kategori</option>{Object.entries(ARTICLE_CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : (
        <div className="overflow-x-auto rounded-md bg-white p-5 ring-1 ring-line">
          <table className="w-full min-w-[40rem] text-sm">
            <thead><tr><th className={th}>Judul</th><th className={th}>Kategori</th><th className={th}>Status</th><th className={th}>Diperbarui</th><th className={th}><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((a) => (
                <tr key={a._id}>
                  <td className={td}>{a.isPublished ? <Link to={`/pustaka/artikel/${a.slug}`} className="font-semibold text-tosca-dark underline-offset-4 hover:underline">{a.title}</Link> : <span className="font-semibold">{a.title}</span>}</td>
                  <td className={td}>{ARTICLE_CATEGORY_LABEL[a.category]}</td>
                  <td className={td}>{a.isPublished ? "Terbit" : "Draf"}</td>
                  <td className={td}>{formatDate(a.updatedAt)}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button type="button" onClick={() => edit(a)} className="mr-3 font-semibold text-tosca-dark underline-offset-4 hover:underline">Ubah</button>
                    <ConfirmButton title={`Hapus "${a.title}"?`} onConfirm={() => remove(a)} className="font-semibold text-due underline-offset-4 hover:underline">Hapus</ConfirmButton>
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
