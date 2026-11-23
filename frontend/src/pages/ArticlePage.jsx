import { Link, useParams } from "react-router-dom";
import useApi from "../hooks/useApi";
import { Alert, Loading } from "../components/ui";
import { ARTICLE_CATEGORY_LABEL, formatDate } from "../utils/format";

export default function ArticlePage() {
  const { slug } = useParams();
  const { data: a, loading, error } = useApi(`/articles/${slug}`);
  if (loading && !a) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  return (
    <article className="max-w-prose">
      <Link to="/pustaka?tab=artikel" className="mb-4 inline-block text-sm font-semibold text-tosca-dark underline-offset-4 hover:underline">Kembali ke pustaka</Link>
      <p className="text-sm font-semibold text-tosca-dark">{ARTICLE_CATEGORY_LABEL[a.category]}</p>
      <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight">{a.title}</h1>
      <p className="mt-2 text-sm text-ink-soft">Diperbarui {formatDate(a.updatedAt)}</p>
      {/* Isi artikel ditulis sebagai teks biasa; baris kosong memisahkan paragraf */}
      <div className="mt-6 space-y-4 text-lg leading-relaxed">
        {a.content.split(/\n\s*\n|\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {a.regulationIds?.length > 0 && (
        <aside className="mt-8 border-t border-line pt-4 text-sm">
          <p className="font-semibold">Dasar aturan</p>
          <ul className="mt-2 space-y-1">
            {a.regulationIds.map((r) => <li key={r._id}><Link to={`/pustaka/regulasi/${r._id}`} className="text-tosca-dark underline">{r.number}</Link> {r.title}</li>)}
          </ul>
        </aside>
      )}
    </article>
  );
}
