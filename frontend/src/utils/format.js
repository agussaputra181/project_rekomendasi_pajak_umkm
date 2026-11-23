// Format angka, tanggal, dan label yang dipakai banyak halaman.

export const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);

// 520000000 -> "Rp520 jt", 4800000000 -> "Rp4,8 M"
export function formatRupiahShort(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return `Rp${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 1e6) return `Rp${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return formatRupiah(v);
}

// Tanggal dari backend disimpan dalam UTC; timeZone UTC agar tidak bergeser sehari
export const formatDate = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "-";
export const formatDateShort = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value)) : "-";
export const formatDateTime = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "-";

export const percent = (ratio) => `${Math.round((Number(ratio) || 0) * 100)}%`;
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const ROLE_LABEL = { umkm: "Pelaku UMKM", pendamping: "Pendamping Pajak", admin: "Admin" };

export const ENTITY_LABEL = {
  OP: "Orang pribadi",
  PT_PERORANGAN: "PT Perorangan",
  KOPERASI: "Koperasi",
  CV: "CV",
  FIRMA: "Firma",
  PT: "PT",
  BUMDES: "BUMDes",
};

export const SECTOR_LABEL = {
  dagang: "Perdagangan",
  kuliner: "Kuliner (makanan & minuman)",
  produksi: "Produksi / kerajinan",
  jasa: "Jasa",
  pekerjaan_bebas: "Pekerjaan bebas (dokter, konsultan, desainer lepas, dll.)",
  lainnya: "Lainnya",
};

export const CHANNEL_LABEL = { offline: "Langsung / toko", marketplace: "Marketplace", pemerintah: "Instansi pemerintah" };

// Kode pajak pada rekomendasi & kalender
export const TAX_LABEL = {
  PPH_FINAL: "PPh Final 0,5%",
  PPH_BADAN: "PPh Badan",
  PPH_OP: "PPh orang pribadi (skema umum)",
  PPH21: "PPh 21 karyawan",
  PPH22_PMSE: "PPh 22 marketplace",
  PPH22_PEMERINTAH: "PPh 22 bendahara pemerintah",
  PPN: "PPN",
  PBJT: "Pajak restoran (PBJT)",
  PBB: "PBB-P2",
  NPWP: "Pendaftaran NPWP",
  PERINGATAN: "Peringatan batas omzet",
};

export const CALC_LABEL = { PPH_FINAL: "PPh Final 0,5%", PPH_BADAN: "PPh Badan", PPH21: "PPh 21", PPN: "PPN", COMPARE: "Perbandingan skema" };

export const TAX_RULE_LABEL = {
  PPH_FINAL_UMKM: "PPh Final UMKM",
  PPH_BADAN: "PPh Badan",
  PPH21_TER: "PPh 21 TER",
  PPH21_PASAL17: "PPh 21 Pasal 17",
  PTKP: "PTKP",
  PPN: "PPN",
  PPH22_PMSE: "PPh 22 marketplace",
  PPH22_PEMERINTAH: "PPh 22 pemerintah",
  PBJT: "PBJT",
  HARI_LIBUR: "Hari libur & cuti bersama",
};

export const REG_TYPE_LABEL = { UU: "Undang-Undang", PP: "Peraturan Pemerintah", PMK: "Peraturan Menteri Keuangan", PER_DJP: "Peraturan Dirjen Pajak", PERDA: "Peraturan Daerah" };
export const REG_STATUS_LABEL = { berlaku: "Berlaku", diubah: "Diubah", dicabut: "Dicabut" };
export const ARTICLE_CATEGORY_LABEL = { glosarium: "Glosarium", panduan: "Panduan", faq: "Tanya jawab", berita_aturan: "Berita aturan" };
export const PTKP_OPTIONS = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"];
export const AFFECTED_TAX_OPTIONS = ["PPh Final", "PPh Badan", "PPh 21", "PPh 22", "PPN", "PBJT", "PBB", "KUP", "NPWP"];
