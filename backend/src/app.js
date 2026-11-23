// Menyusun aplikasi Express: middleware keamanan -> routes -> penanganan error.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./routes");
const { rejectMongoOperators, sanitizeBody } = require("./middleware/sanitize");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
app.set("trust proxy", 1); // vercel berada di balik proxy; agar rate limit login membaca IP pengguna asli
const mongoose = require("mongoose");
let dbPromise;
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    dbPromise ??= mongoose.connect(process.env.MONGO_URI)
      .catch((err) => { dbPromise = null; throw err; });
    await dbPromise;
  }
  next();
}); 

app.use(helmet()); // header keamanan HTTP
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" })); // hanya domain frontend
app.use(express.json({ limit: "1mb" })); // agar req.body bisa membaca JSON
app.use(rejectMongoOperators); // tolak operator $gt/$ne di body & query (NoSQL injection)
app.use(sanitizeBody); // bersihkan tag HTML berbahaya (XSS)
if (process.env.NODE_ENV !== "test") app.use(morgan("dev")); // log request di terminal

app.get("/", (req, res) => res.json({ status: "success", message: "API Pajak UMKM berjalan" }));
app.use("/api/v1", routes);

app.use(notFound); // 404 untuk URL yang tidak ada
app.use(errorHandler); // semua error menjadi JSON yang seragam

module.exports = app;
