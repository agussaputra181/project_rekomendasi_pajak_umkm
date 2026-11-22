// Uji API (SRS Tabel 34, TC-API-01 s.d. TC-API-15) + evaluasi keamanan (SRS 4.2).
// Memakai database MongoDB sementara di memori (mongodb-memory-server), tidak menyentuh database asli.
// Saat pertama dijalankan, mongodb-memory-server mengunduh MongoDB (butuh internet, sekitar 1-2 menit).
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "rahasia-uji";
process.env.JWT_EXPIRES_IN = "1h";
process.env.NODE_ENV = "test";

const app = require("../../src/app");
const User = require("../../src/models/User");
const Regulation = require("../../src/models/Regulation");
const TaxRule = require("../../src/models/TaxRule");
const AdviceRule = require("../../src/models/AdviceRule");
const { DEFAULT_TAX_RULES } = require("../../src/constants/defaultTaxRules");
const { DEFAULT_ADVICE_RULES } = require("../../src/constants/defaultAdviceRules");
const { REGULATIONS } = require("../../src/constants/seedContent");

let mongo;
const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const wizard = {
  businessName: "Warung Uji",
  entityType: "OP",
  sector: "kuliner",
  salesChannels: ["offline", "marketplace"],
  hasEmployees: false,
  hasNPWP: true,
  address: { city: "Denpasar" },
  estimatedAnnualRevenue: 300000000,
};

let umkmToken;
let otherToken;
let adminToken;
let pendampingToken;
let businessId;
let otherBusinessId;

beforeAll(async () => {
  // Jest tidak mendukung dynamic import('os') milik driver MongoDB 7.8,
  // jadi modul os diberikan langsung agar metadata koneksi tetap lengkap.
  const connectOptions = { runtimeAdapters: { os: require("os") } };
  // TEST_MONGO_URI diisi -> pakai MongoDB lokal (database khusus uji); kosong -> MongoDB sementara di memori
  if (process.env.TEST_MONGO_URI) {
    await mongoose.connect(process.env.TEST_MONGO_URI, connectOptions);
    await mongoose.connection.dropDatabase(); // mulai dari database uji yang kosong
  } else {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), connectOptions);
  }
  await mongoose.connection.syncIndexes(); // pastikan unique & text index siap
  await Regulation.insertMany(REGULATIONS);
  await TaxRule.insertMany(DEFAULT_TAX_RULES.map(({ regulationNumber, ...r }) => ({ ...r, version: 1, isActive: true, effectiveFrom: new Date("2026-01-01") })));
  await AdviceRule.insertMany(DEFAULT_ADVICE_RULES.map(({ regulationNumbers, ...r }) => ({ ...r, version: 1, isActive: true })));
  await User.create({ name: "Admin Uji", email: "admin@uji.id", password: "admin12345", role: "admin" });
  await User.create({ name: "Pendamping Uji", email: "pendamping@uji.id", password: "pendamping123", role: "pendamping" });
  adminToken = (await api().post("/api/v1/auth/login").send({ email: "admin@uji.id", password: "admin12345" })).body.data.token;
  pendampingToken = (await api().post("/api/v1/auth/login").send({ email: "pendamping@uji.id", password: "pendamping123" })).body.data.token;
}, 180000);

afterAll(async () => {
  if (process.env.TEST_MONGO_URI) await mongoose.connection.dropDatabase(); // bersihkan database uji
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("Autentikasi", () => {
  test("TC-API-01: registrasi valid -> 201, password tersimpan sebagai hash", async () => {
    const res = await api().post("/api/v1/auth/register").send({ name: "Sari Uji", email: "sari@uji.id", password: "rahasia123", role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.user.role).toBe("umkm"); // field role dari body diabaikan
    const saved = await User.findOne({ email: "sari@uji.id" }).select("+password");
    expect(saved.password).not.toBe("rahasia123");
    expect(saved.password.startsWith("$2")).toBe(true);
    umkmToken = res.body.data.token;
  });

  test("TC-API-02: email ganda -> 409", async () => {
    const res = await api().post("/api/v1/auth/register").send({ name: "Sari Lagi", email: "sari@uji.id", password: "rahasia123" });
    expect(res.status).toBe(409);
  });

  test("TC-API-03: email salah format & password < 8 -> 400 + daftar field", async () => {
    const res = await api().post("/api/v1/auth/register").send({ name: "Ab", email: "bukan-email", password: "123" });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(["email", "password"]));
  });

  test("TC-API-04: login valid -> 200 + token berisi id & role", async () => {
    const res = await api().post("/api/v1/auth/login").send({ email: "sari@uji.id", password: "rahasia123" });
    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
    expect(payload.role).toBe("umkm");
    expect(payload.id).toBeDefined();
  });

  test("TC-API-05: password salah -> 401 dengan pesan umum", async () => {
    const res = await api().post("/api/v1/auth/login").send({ email: "sari@uji.id", password: "salah12345" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Email atau password salah");
  });

  test("Ganti password -> 200, password lama tidak berlaku", async () => {
    const res = await api().put("/api/v1/auth/password").set(auth(umkmToken)).send({ currentPassword: "rahasia123", newPassword: "rahasia456" });
    expect(res.status).toBe(200);
    const login = await api().post("/api/v1/auth/login").send({ email: "sari@uji.id", password: "rahasia456" });
    expect(login.status).toBe(200);
  });
});

describe("Profil usaha, omzet, rekomendasi", () => {
  test("TC-API-07: buat profil usaha -> 201 + rekomendasi otomatis", async () => {
    const res = await api().post("/api/v1/businesses").set(auth(umkmToken)).send(wizard);
    expect(res.status).toBe(201);
    expect(res.body.data.recommendation.items.length).toBeGreaterThan(0);
    businessId = res.body.data.business._id;
  });

  test("Catat omzet valid -> 201", async () => {
    const res = await api()
      .post(`/api/v1/businesses/${businessId}/revenues`)
      .set(auth(umkmToken))
      .send({ year: 2026, month: 1, amount: 50000000, channels: { offline: 30000000, marketplace: 20000000, pemerintah: 0 } });
    expect(res.status).toBe(201);
    expect(res.body.data.revenue.amount).toBe(50000000); // Decimal128 dikirim sebagai angka
  });

  test("TC-API-08: omzet bulan yang sama dua kali -> 409", async () => {
    const res = await api()
      .post(`/api/v1/businesses/${businessId}/revenues`)
      .set(auth(umkmToken))
      .send({ year: 2026, month: 1, amount: 1000, channels: { offline: 1000 } });
    expect(res.status).toBe(409);
  });

  test("TC-API-09: omzet negatif -> 400", async () => {
    const res = await api()
      .post(`/api/v1/businesses/${businessId}/revenues`)
      .set(auth(umkmToken))
      .send({ year: 2026, month: 2, amount: -1, channels: { offline: -1 } });
    expect(res.status).toBe(400);
  });

  test("TC-API-10: rincian kanal tidak sama dengan total -> 400", async () => {
    const res = await api()
      .post(`/api/v1/businesses/${businessId}/revenues`)
      .set(auth(umkmToken))
      .send({ year: 2026, month: 3, amount: 10000000, channels: { offline: 5000000, marketplace: 1000000 } });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain("channels");
  });

  test("TC-API-11: usaha dengan id acak -> 404", async () => {
    const res = await api().get(`/api/v1/businesses/${new mongoose.Types.ObjectId()}`).set(auth(umkmToken));
    expect(res.status).toBe(404);
  });

  test("TC-API-14: tandai langkah saran selesai -> 200, done = true, doneAt terisi", async () => {
    const latest = await api().get(`/api/v1/businesses/${businessId}/recommendations/latest`).set(auth(umkmToken));
    const recommendation = latest.body.data;
    const action = recommendation.items[0].actions[0];
    const res = await api().patch(`/api/v1/recommendations/${recommendation._id}/actions/${action._id}`).set(auth(umkmToken)).send({ done: true });
    expect(res.status).toBe(200);
    const updated = res.body.data.items[0].actions.find((a) => a._id === action._id);
    expect(updated.done).toBe(true);
    expect(updated.doneAt).toBeTruthy();
  });

  test("Kalkulator PPh Final, riwayat, jatuh tempo, dan dashboard", async () => {
    const calc = await api().post("/api/v1/calculations/pph-final").set(auth(umkmToken)).send({ businessId, year: 2026, month: 1 });
    expect(calc.status).toBe(200);
    expect(calc.body.data.result.taxDue).toBe(0); // OP masih di bawah Rp500 juta
    const history = await api().get(`/api/v1/businesses/${businessId}/calculations`).set(auth(umkmToken));
    expect(history.body.pagination.total).toBe(1);
    const deadlines = await api().get(`/api/v1/businesses/${businessId}/deadlines?year=2026`).set(auth(umkmToken));
    expect(deadlines.status).toBe(200);
    const dashboard = await api().get(`/api/v1/dashboard/umkm/${businessId}`).set(auth(umkmToken));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.revenue.months).toHaveLength(12);
  });

  test("Kalkulator PPh Final untuk pekerjaan bebas -> 422 (TC-CALC-05)", async () => {
    const created = await api().post("/api/v1/businesses").set(auth(umkmToken)).send({ ...wizard, businessName: "Praktik dr. Uji", sector: "pekerjaan_bebas" });
    const id = created.body.data.business._id;
    await api().post(`/api/v1/businesses/${id}/revenues`).set(auth(umkmToken)).send({ year: 2026, month: 1, amount: 1000000, channels: { offline: 1000000 } });
    const res = await api().post("/api/v1/calculations/pph-final").set(auth(umkmToken)).send({ businessId: id, year: 2026, month: 1 });
    expect(res.status).toBe(422);
  });
});

describe("Regulasi", () => {
  test("TC-API-12: pencarian q=marketplace -> PMK 37/2025 ada di hasil", async () => {
    const res = await api().get("/api/v1/regulations?q=marketplace");
    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.number)).toContain("PMK 37/2025");
  });

  test("TC-API-13: filter & urut menurun + info pagination", async () => {
    const res = await api().get("/api/v1/regulations?status=berlaku&sort=-effectiveDate&page=1&limit=10");
    expect(res.status).toBe(200);
    const dates = res.body.data.filter((r) => r.effectiveDate).map((r) => new Date(r.effectiveDate).getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
    expect(res.body.pagination.total).toBe(REGULATIONS.filter((r) => r.status === "berlaku").length);
  });

  test("Regulasi yang masih dirujuk tidak bisa dihapus -> 409", async () => {
    const reg = await Regulation.findOne({ number: "PP 20/2026" });
    await TaxRule.updateOne({ taxType: "PPH_FINAL_UMKM" }, { regulationId: reg._id });
    const res = await api().delete(`/api/v1/regulations/${reg._id}`).set(auth(adminToken));
    expect(res.status).toBe(409);
  });
});

describe("Aturan tarif", () => {
  test("TC-API-15: versi tarif yang membuat test case salah -> 422, tidak diaktifkan", async () => {
    const final = DEFAULT_TAX_RULES.find((r) => r.taxType === "PPH_FINAL_UMKM");
    const draft = await api()
      .post("/api/v1/tax-rules")
      .set(auth(adminToken))
      .send({ taxType: "PPH_FINAL_UMKM", parameters: { ...final.parameters, rate: 0.01 }, effectiveFrom: "2026-12-01" });
    expect(draft.status).toBe(201);
    const res = await api().post(`/api/v1/tax-rules/${draft.body.data._id}/activate`).set(auth(adminToken));
    expect(res.status).toBe(422);
    const stillDraft = await TaxRule.findById(draft.body.data._id);
    expect(stillDraft.isActive).toBe(false);
  });
});

describe("Keamanan (SRS 4.2)", () => {
  test("Tanpa token, token diubah, kunci lain, kedaluwarsa -> 401", async () => {
    const url = "/api/v1/auth/me";
    expect((await api().get(url)).status).toBe(401);
    expect((await api().get(url).set(auth(umkmToken + "x"))).status).toBe(401);
    const otherKey = jwt.sign({ id: new mongoose.Types.ObjectId(), role: "admin" }, "kunci-lain");
    expect((await api().get(url).set(auth(otherKey))).status).toBe(401);
    const expired = jwt.sign({ id: new mongoose.Types.ObjectId(), role: "umkm" }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect((await api().get(url).set(auth(expired))).status).toBe(401);
  });

  test("UMKM A mengakses usaha UMKM B -> 403; UMKM memanggil endpoint admin -> 403", async () => {
    const reg = await api().post("/api/v1/auth/register").send({ name: "Budi Uji", email: "budi@uji.id", password: "rahasia123" });
    otherToken = reg.body.data.token;
    const created = await api().post("/api/v1/businesses").set(auth(otherToken)).send({ ...wizard, businessName: "Toko Budi" });
    otherBusinessId = created.body.data.business._id;
    expect((await api().get(`/api/v1/businesses/${otherBusinessId}`).set(auth(umkmToken))).status).toBe(403);
    expect((await api().get("/api/v1/users").set(auth(umkmToken))).status).toBe(403);
  });

  test("Pendamping hanya melihat UMKM binaannya", async () => {
    expect((await api().get(`/api/v1/businesses/${otherBusinessId}`).set(auth(pendampingToken))).status).toBe(403);
    const pendamping = await User.findOne({ email: "pendamping@uji.id" });
    const budi = await User.findOne({ email: "budi@uji.id" });
    const assign = await api().patch(`/api/v1/users/${budi._id}/pendamping`).set(auth(adminToken)).send({ pendampingId: pendamping._id });
    expect(assign.status).toBe(200);
    expect((await api().get(`/api/v1/businesses/${otherBusinessId}`).set(auth(pendampingToken))).status).toBe(200);
    const monitoring = await api().get("/api/v1/dashboard/monitoring").set(auth(pendampingToken));
    expect(monitoring.status).toBe(200);
    expect(monitoring.body.data.totals.businesses).toBe(1);
  });

  test("Operator NoSQL di body login -> 400", async () => {
    const res = await api().post("/api/v1/auth/login").send({ email: "sari@uji.id", password: { $ne: "" } });
    expect(res.status).toBe(400);
  });

  test("Tag script pada nama usaha tersanitasi", async () => {
    const res = await api().post("/api/v1/businesses").set(auth(umkmToken)).send({ ...wizard, businessName: "Toko <script>alert(1)</script>" });
    expect(res.status).toBe(201);
    expect(res.body.data.business.businessName).not.toContain("<script>");
  });

  // Diletakkan paling akhir karena membuat IP terkena batas login
  test("TC-API-06: lebih dari 5 percobaan login gagal -> 429", async () => {
    let last;
    for (let i = 0; i < 6; i++) {
      last = await api().post("/api/v1/auth/login").send({ email: "sari@uji.id", password: `salah-${i}` });
    }
    expect(last.status).toBe(429);
  });
});
