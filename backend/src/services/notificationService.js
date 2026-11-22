// Membuat notifikasi di aplikasi (SRS FR-014 & FR-008):
// - THRESHOLD   : omzet mencapai 80% batas, melewati Rp500 juta, atau melewati Rp4,8 miliar
// - DEADLINE    : H-3 sebelum jatuh tempo, pada hari jatuh tempo, dan saat terlewat
// - RULE_UPDATE : Admin mengaktifkan versi aturan tarif baru
// Field "key" unik per pengguna mencegah notifikasi yang sama dibuat berkali-kali.
const Notification = require("../models/Notification");
const Business = require("../models/Business");
const User = require("../models/User");
const Recommendation = require("../models/Recommendation");
const { rupiah } = require("../utils/money");
const { buildDeadlines } = require("./calendarService");
const { getBusinessContext } = require("./businessDataService");
const { obligationsOf } = require("./recommendationService");

const DAY = 24 * 60 * 60 * 1000;

// Membuat notifikasi hanya jika key-nya belum pernah ada (upsert + $setOnInsert)
async function createOnce(userId, key, data) {
  // userId & key sudah ada di filter, jadi otomatis ikut tersimpan saat dokumen baru dibuat
  await Notification.updateOne({ userId, key }, { $setOnInsert: { ...data, isRead: false } }, { upsert: true });
}

async function notifyThresholds(business, ctx) {
  const userId = business.userId;
  const base = `THRESHOLD-${business._id}-${ctx.year}`;
  const name = business.businessName;
  if (ctx.entityType === "OP") {
    if (ctx.cumulativeRevenue > ctx.opExemption) {
      await createOnce(userId, `${base}-OP-LEWAT`, {
        businessId: business._id, type: "THRESHOLD",
        title: `Omzet ${name} melewati ${rupiah(ctx.opExemption)}`,
        message: "PPh Final 0,5% mulai terutang atas kelebihan omzet. Setor paling lambat tanggal 15 bulan berikutnya.",
      });
    } else if (ctx.cumulativeRevenue >= 0.8 * ctx.opExemption) {
      await createOnce(userId, `${base}-OP-80`, {
        businessId: business._id, type: "THRESHOLD",
        title: `Omzet ${name} sudah ${Math.round((ctx.cumulativeRevenue / ctx.opExemption) * 100)}% dari ${rupiah(ctx.opExemption)}`,
        message: "Siapkan dana pajak. Setelah batas terlampaui, PPh Final 0,5% harus disetor setiap bulan.",
      });
    }
  }
  if (ctx.combinedRevenue > ctx.ceiling) {
    await createOnce(userId, `${base}-CEIL-LEWAT`, {
      businessId: business._id, type: "THRESHOLD",
      title: `Omzet gabungan melewati ${rupiah(ctx.ceiling)}`,
      message: "Mulai tahun pajak berikutnya wajib skema umum dan pengukuhan PKP. Hubungi pendamping pajak.",
    });
  } else if (ctx.combinedRevenue >= 0.8 * ctx.ceiling) {
    await createOnce(userId, `${base}-CEIL-80`, {
      businessId: business._id, type: "THRESHOLD",
      title: `Omzet gabungan sudah ${Math.round((ctx.combinedRevenue / ctx.ceiling) * 100)}% dari ${rupiah(ctx.ceiling)}`,
      message: "Persiapkan pembukuan dan kewajiban PKP.",
    });
  }
}

// Dipanggil saat pengguna membuka notifikasi: membuat pengingat H-3, hari H, dan terlewat
async function ensureDeadlineNotifications(user, now = new Date()) {
  if (user.role !== "umkm") return;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const businesses = await Business.find({ userId: user._id });
  for (const business of businesses) {
    const latest = await Recommendation.findOne({ businessId: business._id, isLatest: true });
    if (!latest) continue;
    const obligations = obligationsOf(latest.items);
    for (const year of [now.getUTCFullYear() - 1, now.getUTCFullYear()]) {
      const { revenue, params, holidays } = await getBusinessContext(business, year);
      const events = buildDeadlines(business, { year, monthlyRevenue: revenue.monthly, obligations, params, holidays });
      for (const event of events) {
        const days = Math.round((event.dueDate.getTime() - today) / DAY);
        let suffix = null;
        let title = null;
        if (days >= 1 && days <= 3) [suffix, title] = ["H3", `${days} hari lagi: ${event.title}`];
        else if (days === 0) [suffix, title] = ["H0", `Hari ini batas akhir: ${event.title}`];
        else if (days < 0 && days >= -7) [suffix, title] = ["LEWAT", `Terlewat: ${event.title}`];
        if (!suffix) continue;
        await createOnce(user._id, `DEADLINE-${business._id}-${event.key}-${suffix}`, {
          businessId: business._id, type: "DEADLINE", title,
          message: `${business.businessName}. Batas: ${event.dueDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}${suffix === "LEWAT" ? ". Abaikan bila sudah dikerjakan." : ""}`,
          dueDate: event.dueDate,
        });
      }
    }
  }
}

async function notifyRuleUpdate(taxType, version) {
  const users = await User.find({ role: "umkm", isActive: true }).select("_id");
  for (const user of users) {
    await createOnce(user._id, `RULE-${taxType}-v${version}`, {
      type: "RULE_UPDATE",
      title: `Aturan ${taxType} diperbarui (versi ${version})`,
      message: "Rekomendasi dan perhitungan berikutnya memakai aturan terbaru. Buka menu Rekomendasi untuk memperbarui.",
    });
  }
}

module.exports = { notifyThresholds, ensureDeadlineNotifications, notifyRuleUpdate, createOnce };
