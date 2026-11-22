// NILAI AWAL collection "advice_rules": tabel keputusan R-01 s.d. R-15 (SRS Tabel 29).
// Setiap aturan = daftar kondisi (digabung dengan AND) -> pajak yang direkomendasikan + saran.
//
// "field" merujuk ke data konteks yang disusun rule engine (lihat services/ruleEngine.js, CONTEXT_FIELDS).
// "value" yang diawali "$" diambil dari konteks juga, misalnya "$ceiling" = batas omzet dari tax_rules aktif.
// Kondisi "ATAU" pada SRS diwakili field turunan (misalnya generalSchemeRequired), karena kondisi selalu AND.
//
// taxType memakai kode tetap agar bisa dihubungkan ke kalender & kalkulator:
// PPH_FINAL, PPH_BADAN, PPH_OP, PPH21, PPH22_PMSE, PPH22_PEMERINTAH, PPN, PBJT, PBB, NPWP, PERINGATAN

const ELIGIBLE = ["OP", "PT_PERORANGAN", "KOPERASI"];
const BADAN = ["CV", "FIRMA", "PT", "BUMDES"];

const DEFAULT_ADVICE_RULES = [
  {
    code: "R-01",
    name: "Berhak PPh Final 0,5%",
    conditions: [
      { field: "entityType", operator: "in", value: ELIGIBLE },
      { field: "combinedRevenue", operator: "lte", value: "$ceiling" },
      { field: "sector", operator: "ne", value: "pekerjaan_bebas" },
      { field: "withinCooperativePeriod", operator: "eq", value: true },
    ],
    taxType: "PPH_FINAL",
    applicable: true,
    priority: 1,
    explanation:
      "Bentuk usaha Anda boleh memakai PPh Final {tarifFinal} dari omzet bulanan, karena omzet gabungan setahun ({omzetGabungan}) tidak lebih dari {batasOmzet}.",
    actionSteps: [
      "Catat omzet setiap bulan di menu Omzet",
      "Setor PPh Final paling lambat tanggal 15 bulan berikutnya",
      "Ajukan Surat Keterangan PP 55 di Coretax bila bertransaksi dengan pemotong pajak",
      "Laporkan omzet dan PPh Final di SPT Tahunan",
    ],
    regulationNumbers: ["PP 55/2022", "PP 20/2026", "PMK 164/2023"],
  },
  {
    code: "R-02",
    name: "Orang pribadi belum melewati Rp500 juta",
    conditions: [
      { field: "entityType", operator: "eq", value: "OP" },
      { field: "cumulativeRevenue", operator: "lte", value: "$opExemption" },
      { field: "sector", operator: "ne", value: "pekerjaan_bebas" },
      { field: "combinedRevenue", operator: "lte", value: "$ceiling" },
    ],
    taxType: "PPH_FINAL",
    applicable: false,
    priority: 2,
    explanation:
      "Omzet Anda tahun ini baru {omzetKumulatif}. Orang pribadi tidak dikenai PPh Final sampai omzet setahun {batasBebas}, jadi belum ada PPh Final yang harus disetor.",
    actionSteps: [
      "Tetap catat omzet setiap bulan",
      "Tetap lapor SPT Tahunan orang pribadi paling lambat 31 Maret",
    ],
    regulationNumbers: ["UU 7/2021", "PP 55/2022"],
  },
  {
    code: "R-03",
    name: "Badan (CV/Firma/PT/BUMDes) memakai tarif umum",
    conditions: [
      { field: "entityType", operator: "in", value: BADAN },
      { field: "transitionActive", operator: "eq", value: false },
    ],
    taxType: "PPH_BADAN",
    applicable: true,
    priority: 1,
    explanation:
      "Sejak PP 20/2026, CV, firma, PT, dan BUMDes tidak lagi berhak memakai PPh Final 0,5%. Usaha Anda memakai PPh Badan tarif umum 22%, dengan potongan tarif Pasal 31E bila omzet setahun tidak lebih dari Rp50 miliar.",
    actionSteps: [
      "Lakukan pembukuan",
      "Setor angsuran PPh Pasal 25 setiap tanggal 15",
      "Laporkan SPT Tahunan Badan paling lambat 30 April",
    ],
    regulationNumbers: ["PP 20/2026", "UU 7/2021"],
  },
  {
    code: "R-04",
    name: "Badan dalam masa transisi PPh Final",
    conditions: [
      { field: "entityType", operator: "in", value: BADAN },
      { field: "transitionActive", operator: "eq", value: true },
    ],
    taxType: "PPH_FINAL",
    applicable: true,
    priority: 1,
    explanation:
      "Usaha Anda sudah memakai PPh Final sebelum PP 20/2026 berlaku, sehingga masih boleh memakai PPh Final {tarifFinal} sampai masa fasilitas berakhir (tahun pajak {tahunAkhirFasilitas}).",
    actionSteps: [
      "Catat sisa masa fasilitas PPh Final",
      "Siapkan pembukuan untuk peralihan ke tarif umum",
      "Setor PPh Final paling lambat tanggal 15 bulan berikutnya",
    ],
    regulationNumbers: ["PP 20/2026", "PP 55/2022"],
  },
  {
    code: "R-05",
    name: "Wajib skema umum (melewati batas atau masa fasilitas)",
    conditions: [
      { field: "entityType", operator: "in", value: ELIGIBLE },
      { field: "generalSchemeRequired", operator: "eq", value: true },
    ],
    taxType: "PPH_OP",
    applicable: true,
    priority: 1,
    explanation:
      "Omzet gabungan Anda ({omzetGabungan}) melebihi {batasOmzet} atau masa fasilitas koperasi sudah habis, sehingga tidak bisa memakai PPh Final. Orang pribadi memakai tarif Pasal 17, badan memakai tarif 22% (dengan Pasal 31E bila omzet tidak lebih dari Rp50 miliar).",
    actionSteps: [
      "Lakukan pembukuan",
      "Hitung dan setor angsuran PPh Pasal 25 setiap tanggal 15",
      "Konsultasikan dengan pendamping pajak",
    ],
    regulationNumbers: ["UU 7/2021", "PP 20/2026"],
  },
  {
    code: "R-06",
    name: "Pekerjaan bebas tidak bisa PPh Final",
    conditions: [{ field: "sector", operator: "eq", value: "pekerjaan_bebas" }],
    taxType: "PPH_OP",
    applicable: false,
    priority: 2,
    explanation:
      "Penghasilan dari pekerjaan bebas (misalnya dokter, konsultan, desainer lepas) tidak dapat memakai PPh Final 0,5%. Penghasilan ini dihitung dengan skema umum: pembukuan, atau norma penghitungan bila memenuhi syarat.",
    actionSteps: [
      "Pisahkan pencatatan penghasilan pekerjaan bebas dari usaha lain",
      "Pelajari norma penghitungan penghasilan neto",
    ],
    regulationNumbers: ["PP 20/2026"],
  },
  {
    code: "R-07",
    name: "Memiliki karyawan",
    conditions: [{ field: "hasEmployees", operator: "eq", value: true }],
    taxType: "PPH21",
    applicable: true,
    priority: 3,
    explanation: "Anda mempekerjakan karyawan, sehingga wajib memotong PPh 21 dari gaji mereka setiap bulan dengan tarif efektif (TER).",
    actionSteps: [
      "Isi data karyawan dan status PTKP di menu Karyawan",
      "Potong PPh 21 setiap bulan, setor tanggal 15 dan lapor tanggal 20",
      "Buat bukti potong A1 di akhir tahun",
    ],
    regulationNumbers: ["PP 58/2023", "PMK 168/2023", "PMK 81/2024"],
  },
  {
    code: "R-08",
    name: "Marketplace, omzet belum Rp500 juta",
    conditions: [
      { field: "salesChannels", operator: "in", value: ["marketplace"] },
      { field: "entityType", operator: "eq", value: "OP" },
      { field: "cumulativeRevenue", operator: "lte", value: "$opExemption" },
      { field: "marketplaceStatementSent", operator: "eq", value: false },
    ],
    taxType: "PPH22_PMSE",
    applicable: false,
    priority: 4,
    explanation:
      "Selama omzet Anda belum melewati {batasBebas}, marketplace tidak memungut PPh 22 asalkan Anda menyampaikan surat pernyataan omzet.",
    actionSteps: ["Kirim surat pernyataan omzet tidak lebih dari Rp500 juta ke setiap marketplace", "Tandai di profil usaha setelah surat terkirim"],
    regulationNumbers: ["PMK 37/2025"],
  },
  {
    code: "R-09",
    name: "Marketplace memungut PPh 22",
    conditions: [
      { field: "salesChannels", operator: "in", value: ["marketplace"] },
      { field: "pph22Withheld", operator: "eq", value: true },
    ],
    taxType: "PPH22_PMSE",
    applicable: true,
    priority: 4,
    explanation:
      "Marketplace memungut PPh 22 sebesar 0,5% dari penjualan Anda. Pungutan ini mengurangi PPh Final yang harus Anda setor sendiri, jadi simpan buktinya.",
    actionSteps: [
      "Kirim pernyataan ke marketplace paling lambat akhir bulan saat omzet melewati Rp500 juta",
      "Catat PPh 22 yang dipungut di kolom PPh 22 saat mencatat omzet",
    ],
    regulationNumbers: ["PMK 37/2025", "PP 20/2026"],
  },
  {
    code: "R-10",
    name: "Menjual ke instansi pemerintah",
    conditions: [{ field: "salesChannels", operator: "in", value: ["pemerintah"] }],
    taxType: "PPH22_PEMERINTAH",
    applicable: true,
    priority: 5,
    explanation:
      "Bendahara pemerintah memungut PPh 22 sebesar 1,5%, kecuali Anda menyerahkan Surat Keterangan PP 55 sehingga yang berlaku PPh Final 0,5%.",
    actionSteps: ["Ajukan Surat Keterangan PP 55 di Coretax sebelum bertransaksi"],
    regulationNumbers: ["UU 7/2021", "PP 55/2022"],
  },
  {
    code: "R-11",
    name: "Wajib dikukuhkan sebagai PKP",
    conditions: [{ field: "mustBePKP", operator: "eq", value: true }],
    taxType: "PPN",
    applicable: true,
    priority: 2,
    explanation:
      "Omzet setahun Anda melebihi {batasOmzet} atau Anda sudah PKP, sehingga wajib memungut PPN 12% x DPP 11/12. Omzet kuliner yang sudah dipungut PBJT tidak dihitung untuk batas PKP.",
    actionSteps: ["Ajukan pengukuhan PKP", "Terbitkan faktur pajak", "Setor dan lapor PPN paling lambat akhir bulan berikutnya"],
    regulationNumbers: ["UU 42/2009", "PMK 131/2024", "PMK 81/2024"],
  },
  {
    code: "R-12",
    name: "Usaha kuliner (pajak daerah)",
    conditions: [{ field: "sector", operator: "eq", value: "kuliner" }],
    taxType: "PBJT",
    applicable: true,
    priority: 6,
    explanation:
      "Usaha makanan dan minuman dapat dikenai Pajak Barang dan Jasa Tertentu (PBJT) oleh pemerintah daerah, tarif paling tinggi 10%, bila omzet melewati batas di perda {kota}.",
    actionSteps: ["Cek batas omzet PBJT di perda kota Anda", "Daftar ke Bapenda bila omzet melewati batas"],
    regulationNumbers: ["UU 1/2022"],
  },
  {
    code: "R-13",
    name: "Memiliki tanah/bangunan usaha",
    conditions: [{ field: "ownsBusinessProperty", operator: "eq", value: true }],
    taxType: "PBB",
    applicable: true,
    priority: 7,
    explanation: "Tanah dan bangunan tempat usaha dikenai PBB-P2 setiap tahun sesuai SPPT dari pemerintah daerah.",
    actionSteps: ["Bayar PBB-P2 sesuai SPPT sebelum jatuh tempo"],
    regulationNumbers: ["UU 1/2022"],
  },
  {
    code: "R-14",
    name: "Belum punya NPWP",
    conditions: [{ field: "hasNPWP", operator: "eq", value: false }],
    taxType: "NPWP",
    applicable: true,
    priority: 0,
    explanation: "Anda belum terdaftar sebagai wajib pajak. NPWP (atau NIK yang sudah diaktivasi) diperlukan untuk menyetor dan melaporkan pajak.",
    actionSteps: ["Aktivasi NIK sebagai NPWP di Coretax DJP", "Simpan nomor NPWP di profil usaha"],
    regulationNumbers: ["UU 6/1983"],
  },
  {
    code: "R-15",
    name: "Omzet mendekati batas",
    conditions: [{ field: "nearThreshold", operator: "eq", value: true }],
    taxType: "PERINGATAN",
    applicable: true,
    priority: 0,
    explanation:
      "Omzet Anda sudah mencapai {persenBatas} dari batas {batasTerdekat}. Siapkan dana pajak dan persiapkan perubahan kewajiban saat batas terlampaui.",
    actionSteps: ["Siapkan dana untuk pajak", "Pelajari kewajiban PKP dan skema umum bila batas Rp4,8 miliar terlampaui"],
    regulationNumbers: ["PP 20/2026", "UU 7/2021"],
  },
];

module.exports = { DEFAULT_ADVICE_RULES };
