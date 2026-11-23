// Komponen tampilan kecil yang dipakai berulang. Gaya cukup diatur di sini.
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Bagian halaman: judul + isi, dipisah garis tipis
export function Section({ title, aside, className = "", children }) {
  return (
    <section className={`border-t border-line pt-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

// Permukaan putih untuk form & tabel
export function Panel({ className = "", children }) {
  return <div className={`rounded-md bg-white p-5 ring-1 ring-line ${className}`}>{children}</div>;
}

export function PageTitle({ children, note, aside }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight">{children}</h1>
        {note && <p className="mt-2 max-w-prose text-ink-soft">{note}</p>}
      </div>
      {aside}
    </header>
  );
}

// variant: "primary" (aksi utama) | "quiet" (garis) | "danger"
// Di React 19, ref bisa dikirim sebagai props biasa
export function Button({ variant = "primary", className = "", ref, ...props }) {
  const styles = {
    primary: "bg-tosca-dark text-white hover:bg-ink",
    quiet: "bg-white text-ink ring-1 ring-line hover:ring-ink",
    danger: "bg-due text-white hover:bg-ink",
  };
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold disabled:cursor-wait disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

// Label + isian + petunjuk + pesan error (bila ada)
export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs leading-relaxed text-ink-soft">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs font-semibold text-due">{error}</span>}
    </label>
  );
}

// text-base = 16px: input di bawah 16px membuat iOS memperbesar halaman saat diketik
export const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-tosca focus:ring-2 focus:ring-tosca-wash disabled:bg-paper";

export function Input(props) {
  return <input className={inputClass} {...props} />;
}

// Nominal Rupiah: type="text" + inputMode="numeric" (bukan type="number") agar tidak ada tombol panah
// dan angka tidak berubah saat halaman di-scroll. Tampilan diberi titik ribuan; onChange menerima angka saja.
export function MoneyInput({ value, onChange, ...props }) {
  const shown = value === "" || value === null || value === undefined ? "" : Number(value).toLocaleString("id-ID");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-soft">Rp</span>
      <input
        className={`${inputClass} pl-10`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={shown}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits === "" ? "" : Number(digits));
        }}
        {...props}
      />
    </div>
  );
}

// Password dengan tombol "Tampilkan"
export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input className={`${inputClass} pr-28`} type={show ? "text" : "password"} {...props} />
      <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="absolute inset-y-0 right-0 px-3 text-sm font-semibold text-tosca-dark">
        {show ? "Sembunyikan" : "Tampilkan"}
      </button>
    </div>
  );
}

export function Select({ children, ...props }) {
  return <select className={inputClass} {...props}>{children}</select>;
}

export function Textarea({ className = "", ...props }) {
  return <textarea className={`${inputClass} min-h-28 leading-relaxed ${className}`} {...props} />;
}

export function Checkbox({ label, hint, ...props }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-tosca" {...props} />
      <span>
        {label}
        {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

// type: "error" | "warning" | "info" | "success"
export function Alert({ type = "error", children }) {
  if (!children) return null;
  const styles = {
    error: "border-due text-due bg-white",
    warning: "border-warn text-warn bg-warn-wash",
    info: "border-tosca text-ink bg-tosca-wash",
    success: "border-ok text-ok bg-white",
  };
  return <div role={type === "error" ? "alert" : undefined} className={`mb-4 border-l-4 px-4 py-3 text-sm font-medium ${styles[type]}`}>{children}</div>;
}

// Penanda berlaku / tidak berlaku pada rekomendasi
export function ApplicableLabel({ applicable }) {
  return applicable ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-due">
      <span className="h-2 w-2 rounded-full bg-due" aria-hidden="true" /> Berlaku untuk Anda
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok">
      <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" /> Tidak / belum berlaku
    </span>
  );
}

export function Loading({ children = "Memuat data…" }) {
  return <p className="py-16 text-sm text-ink-soft" role="status">{children}</p>;
}

// Pesan saat data kosong: jelaskan apa yang bisa dilakukan
export function Empty({ children }) {
  return <div className="rounded-md border border-dashed border-line px-5 py-8 text-ink-soft">{children}</div>;
}

// Tab dengan pola ARIA: panah kiri/kanan memindah pilihan, Home/End ke ujung
export function Tabs({ label, items, value, onChange }) {
  const refs = useRef({});
  function onKeyDown(e, index) {
    const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = items[(keys[e.key] + items.length) % items.length];
    onChange(next.key);
    refs.current[next.key]?.focus();
  }
  return (
    <div role="tablist" aria-label={label} className="mb-6 flex flex-wrap gap-1 border-b border-line">
      {items.map((t, index) => {
        const selected = value === t.key;
        return (
          <button
            key={t.key}
            ref={(el) => (refs.current[t.key] = el)}
            id={`tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${t.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className="px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ tabKey, children }) {
  return <div role="tabpanel" id={`panel-${tabKey}`} aria-labelledby={`tab-${tabKey}`}>{children}</div>;
}

// Kelas tabel yang dipakai berulang
export const th = "pb-2 pr-3 text-left text-sm font-semibold text-ink-soft";
export const td = "py-2.5 pr-3 align-top";

// Nota hitungan pajak: rincian, total bergaris ganda, dan langkah perhitungan
export function Nota({ title, subtitle, lines = [], totalLabel, totalNote, total, steps = [], children }) {
  return (
    <div className="rounded-md bg-white ring-1 ring-line">
      <div className="px-6 pt-6">
        <p className="font-bold">{title}</p>
        {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {lines.length > 0 && (
        <dl className="mt-5 px-6 text-sm">
          {lines.map(([label, value, strong], i) => (
            <div key={i} className={`flex justify-between gap-4 py-2.5 ${i < lines.length - 1 ? "border-b border-dashed border-line" : ""} ${strong ? "font-semibold" : ""}`}>
              <dt className={strong ? "" : "text-ink-soft"}>{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-t-4 border-double border-ink px-6 py-5">
        <div>
          <p className="text-sm font-semibold">{totalLabel}</p>
          {totalNote && <p className="text-sm text-ink-soft">{totalNote}</p>}
        </div>
        <p className="text-3xl font-extrabold tracking-tight">{total}</p>
      </div>
      {steps.length > 0 && (
        <details className="border-t border-line px-6 py-4 text-sm" open>
          <summary className="cursor-pointer font-semibold">Langkah perhitungan</summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-ink-soft">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}

// Tombol yang meminta konfirmasi lewat <dialog> bawaan browser (pengganti window.confirm).
// showModal(): halaman belakang tidak bisa diklik, fokus terkunci di dialog, tombol Esc menutup.
// Dialog dipindah ke <body> dengan createPortal agar <form> di dalamnya tidak bersarang di form halaman.
export function ConfirmButton({ title, message, confirmLabel = "Hapus", onConfirm, className = "", children, ...props }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();

  function open() {
    dialogRef.current.showModal();
    cancelRef.current.focus(); // fokus awal di pilihan aman
  }

  return (
    <>
      <button type="button" onClick={open} className={className} {...props}>{children}</button>
      {createPortal(
        <dialog ref={dialogRef} aria-labelledby={titleId} closedby="any"
          className="m-auto w-[min(26rem,calc(100%-2rem))] whitespace-normal rounded-md bg-white p-6 text-left font-normal text-ink backdrop:bg-ink/50">
          <h2 id={titleId} className="text-lg font-extrabold">{title}</h2>
          {message && <p className="mt-2 text-ink-soft">{message}</p>}
          <form method="dialog" className="mt-6 flex justify-end gap-2"
            onSubmit={(e) => { if (e.nativeEvent.submitter?.value === "ok") onConfirm(); }}>
            <Button ref={cancelRef} variant="quiet" value="batal">Batal</Button>
            <Button variant="danger" value="ok">{confirmLabel}</Button>
          </form>
        </dialog>,
        document.body
      )}
    </>
  );
}

// Navigasi halaman untuk daftar berpagination: { page, totalPages, total }
export function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <nav aria-label="Halaman" className="mt-4 flex items-center justify-between gap-4 text-sm">
      <span className="text-ink-soft">{total} data, halaman {page} dari {totalPages}</span>
      <span className="flex gap-2">
        <Button variant="quiet" disabled={page <= 1} onClick={() => onChange(page - 1)}>Sebelumnya</Button>
        <Button variant="quiet" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Berikutnya</Button>
      </span>
    </nav>
  );
}

// Batang progres sederhana (misalnya checklist saran)
export function Progress({ value, label }) {
  const pct = Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100)));
  return (
    <div>
      <div className="h-2.5 rounded-full bg-paper ring-1 ring-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
        <div className="h-full rounded-full bg-tosca" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
