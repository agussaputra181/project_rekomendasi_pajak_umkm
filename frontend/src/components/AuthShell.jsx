// Tampilan dua kolom untuk halaman Masuk & Daftar.
export default function AuthShell({ title, children }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-ink px-14 py-12 text-white md:flex">
        <p className="text-lg font-extrabold">Pajak UMKM</p>
        <div className="max-w-md">
          <p className="text-4xl font-extrabold leading-[1.15] tracking-tight">Pajak apa yang harus dibayar usahamu, dan kapan?</p>
          <p className="mt-5 text-lg leading-relaxed text-white/75">
            Ceritakan usahamu dan catat omzet tiap bulan. Sistem menunjukkan pajak yang berlaku, alasannya, jatuh temponya, dan langkah yang perlu dilakukan.
          </p>
        </div>
        <p className="text-sm text-white/50">Estimasi edukatif berdasarkan aturan pajak yang berlaku. Bukan pengganti konsultasi resmi.</p>
      </div>
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <p className="mb-6 text-lg font-extrabold md:hidden">Pajak UMKM</p>
          <h1 className="mb-8 text-2xl font-extrabold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
