// Istilah pajak yang bisa diklik untuk melihat penjelasan singkat (NFR Usability: tooltip/glosarium).
// Memakai Popover API bawaan browser: klik di luar atau tombol Esc otomatis menutup.
import { useId } from "react";
import { Link } from "react-router-dom";

export const GLOSSARY = {
  PKP: { text: "Pengusaha Kena Pajak: pengusaha yang wajib memungut PPN dari pembeli. Wajib bila omzet setahun lebih dari Rp4,8 miliar.", slug: "pkp-pengusaha-kena-pajak" },
  omzet: { text: "Seluruh uang hasil penjualan sebelum dikurangi biaya apa pun.", slug: "omzet-peredaran-bruto" },
  PTKP: { text: "Penghasilan Tidak Kena Pajak: bagian penghasilan setahun yang tidak dikenai pajak, mulai Rp54 juta.", slug: "ptkp-penghasilan-tidak-kena-pajak" },
  TER: { text: "Tarif Efektif Rata-rata: tarif sederhana untuk memotong PPh 21 karyawan setiap bulan.", slug: "ter-tarif-efektif-rata-rata" },
  DPP: { text: "Dasar Pengenaan Pajak: nilai yang dikalikan dengan tarif pajak." },
  NPWP: { text: "Nomor Pokok Wajib Pajak. Untuk orang pribadi, NIK yang sudah diaktivasi di Coretax berlaku sebagai NPWP." },
  "PPh Final": { text: "Pajak penghasilan yang dihitung langsung dari omzet dengan tarif 0,5%, tanpa menghitung keuntungan.", slug: "apa-itu-pph-final-0-5-untuk-umkm" },
  "PPh 22": { text: "Pajak yang dipungut pihak lain (marketplace atau bendahara pemerintah) saat Anda menjual. Bisa mengurangi pajak yang Anda setor sendiri." },
  PKP_PPH: { text: "Penghasilan Kena Pajak: laba fiskal setelah dikurangi biaya yang boleh dikurangkan." },
};

export default function Term({ word, label, children }) {
  const id = useId();
  const entry = GLOSSARY[word];
  if (!entry) return children || label || word;
  return (
    <>
      <button type="button" popoverTarget={id} className="cursor-help border-b border-dotted border-ink-soft text-inherit">
        {children || label || word}
      </button>
      {/* Memakai <span> agar boleh berada di dalam paragraf <p> */}
      <span id={id} popover="auto" className="term-pop w-[min(22rem,calc(100vw-2rem))] rounded-md bg-white p-5 text-left text-sm font-normal text-ink shadow-xl ring-1 ring-line">
        <span className="block font-bold">{label || word}</span>
        <span className="mt-1 block leading-relaxed text-ink-soft">{entry.text}</span>
        {entry.slug && (
          <Link to={`/pustaka/artikel/${entry.slug}`} className="mt-3 inline-block font-semibold text-tosca-dark underline-offset-4 hover:underline">
            Baca selengkapnya
          </Link>
        )}
      </span>
    </>
  );
}
