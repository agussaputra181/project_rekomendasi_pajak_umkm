// Menyusun kalender jatuh tempo setor/lapor per usaha (SRS Tabel 32).
// Jika jatuh tempo pada Sabtu, Minggu, libur nasional, atau cuti bersama, digeser ke hari kerja berikutnya.

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const toKey = (date) => date.toISOString().slice(0, 10); // "2026-12-15"
const utcDate = (y, m, d) => new Date(Date.UTC(y, m - 1, d)); // m = 1..12
const lastDayOfMonth = (y, m) => new Date(Date.UTC(y, m, 0)); // hari ke-0 bulan berikutnya = akhir bulan ini

function isWorkday(date, holidays) {
  const day = date.getUTCDay(); // 0 = Minggu, 6 = Sabtu
  return day !== 0 && day !== 6 && !holidays.has(toKey(date));
}

// Geser ke hari kerja berikutnya bila perlu
function shiftToWorkday(date, holidays) {
  const result = new Date(date);
  while (!isWorkday(result, holidays)) result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

// Tanggal tertentu pada bulan setelah masa pajak (bulan 12 -> Januari tahun berikutnya)
function dayOfNextMonth(year, month, day) {
  return month === 12 ? utcDate(year + 1, 1, day) : utcDate(year, month + 1, day);
}

function makeEvent(holidays, { key, taxType, kind, title, period, date }) {
  const dueDate = shiftToWorkday(date, holidays);
  return { key, taxType, kind, title, period, originalDate: date, dueDate, shifted: toKey(dueDate) !== toKey(date) };
}

/**
 * @param business      dokumen Business
 * @param options.year              tahun pajak
 * @param options.monthlyRevenue    { 1: 40000000, 2: 52000000, ... } omzet tercatat per bulan
 * @param options.obligations       Set kode pajak yang berlaku dari rekomendasi (PPH_FINAL, PPH21, PPN, ...)
 * @param options.params            { final, badan, pph21, pasal17, ppn } parameter tax_rules aktif
 * @param options.holidays          Set "YYYY-MM-DD"
 */
function buildDeadlines(business, { year, monthlyRevenue = {}, obligations, params, holidays }) {
  const events = [];
  const isOP = business.entityType === "OP";
  const final = params.final;

  let cumulative = 0;
  let crossingMonth = null; // bulan saat omzet OP melewati Rp500 juta

  for (let month = 1; month <= 12; month++) {
    const recorded = monthlyRevenue[month];
    const before = cumulative;
    cumulative += recorded || 0;
    if (isOP && crossingMonth === null && before <= final.opExemption && cumulative > final.opExemption) crossingMonth = month;
    const period = { year, month };
    const monthName = `${MONTHS[month - 1]} ${year}`;

    // PPh Final: untuk OP hanya bulan saat omzet kumulatif melewati batas bebas (bulan belum dicatat dianggap terutang)
    if (obligations.has("PPH_FINAL")) {
      const due = !isOP || recorded === undefined ? true : cumulative > final.opExemption;
      if (due) {
        events.push(makeEvent(holidays, {
          key: `PPH_FINAL-${year}-${month}`, taxType: "PPH_FINAL", kind: "setor",
          title: `Setor PPh Final masa ${monthName}`, period, date: dayOfNextMonth(year, month, final.payDay || 15),
        }));
      }
    }

    if (obligations.has("PPH21")) {
      events.push(makeEvent(holidays, { key: `PPH21-SETOR-${year}-${month}`, taxType: "PPH21", kind: "setor", title: `Setor PPh 21 masa ${monthName}`, period, date: dayOfNextMonth(year, month, params.pph21.payDay || 15) }));
      events.push(makeEvent(holidays, { key: `PPH21-LAPOR-${year}-${month}`, taxType: "PPH21", kind: "lapor", title: `Lapor SPT Masa PPh 21 ${monthName}`, period, date: dayOfNextMonth(year, month, params.pph21.reportDay || 20) }));
    }

    // Angsuran PPh 25 untuk skema umum (badan atau orang pribadi yang tidak memakai PPh Final)
    if (obligations.has("PPH_BADAN") || obligations.has("PPH_OP")) {
      events.push(makeEvent(holidays, { key: `PPH25-SETOR-${year}-${month}`, taxType: obligations.has("PPH_BADAN") ? "PPH_BADAN" : "PPH_OP", kind: "setor", title: `Setor angsuran PPh 25 masa ${monthName}`, period, date: dayOfNextMonth(year, month, params.badan.payDay || 15) }));
      events.push(makeEvent(holidays, { key: `PPH25-LAPOR-${year}-${month}`, taxType: obligations.has("PPH_BADAN") ? "PPH_BADAN" : "PPH_OP", kind: "lapor", title: `Lapor SPT Masa PPh 25 ${monthName}`, period, date: dayOfNextMonth(year, month, params.badan.reportDay || 20) }));
    }

    // PPN: setor & lapor paling lambat akhir bulan berikutnya
    if (obligations.has("PPN")) {
      const nextY = month === 12 ? year + 1 : year;
      const nextM = month === 12 ? 1 : month + 1;
      events.push(makeEvent(holidays, { key: `PPN-${year}-${month}`, taxType: "PPN", kind: "setor", title: `Setor & lapor PPN masa ${monthName}`, period, date: lastDayOfMonth(nextY, nextM) }));
    }
  }

  // Surat pernyataan marketplace: akhir bulan saat omzet melewati Rp500 juta
  if (obligations.has("PPH22_PMSE") && isOP && crossingMonth) {
    events.push(makeEvent(holidays, {
      key: `PMSE-PERNYATAAN-${year}`, taxType: "PPH22_PMSE", kind: "pernyataan",
      title: "Kirim surat pernyataan omzet melewati Rp500 juta ke marketplace", period: { year, month: crossingMonth },
      date: lastDayOfMonth(year, crossingMonth),
    }));
  }

  // SPT Tahunan: orang pribadi 31 Maret, badan 30 April tahun berikutnya
  const deadline = (isOP ? params.pasal17.annualDeadline : params.badan.annualDeadline) || (isOP ? "31-03" : "30-04");
  const [dd, mm] = deadline.split("-").map(Number);
  events.push(makeEvent(holidays, {
    key: `SPT-TAHUNAN-${year}`, taxType: isOP ? "PPH_OP" : "PPH_BADAN", kind: "lapor",
    title: `Lapor SPT Tahunan ${isOP ? "Orang Pribadi" : "Badan"} tahun pajak ${year}`, period: { year, month: null },
    date: utcDate(year + 1, mm, dd),
  }));

  return events.sort((a, b) => a.dueDate - b.dueDate);
}

// Jatuh tempo terdekat (hari ini atau sesudahnya), boleh disaring per kode pajak
function nextDeadline(events, { taxType, from = new Date() } = {}) {
  const today = utcDate(from.getUTCFullYear(), from.getUTCMonth() + 1, from.getUTCDate());
  return events.find((e) => e.dueDate >= today && (!taxType || e.taxType === taxType)) || null;
}

module.exports = { buildDeadlines, nextDeadline, shiftToWorkday, isWorkday, toKey, MONTHS };
