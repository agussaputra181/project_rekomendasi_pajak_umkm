// Mengubah semua error menjadi respons JSON yang seragam (SRS 3.3):
// { status: "error", message, errors: [{ field, message }] }

function notFound(req, res) {
  res.status(404).json({ status: "error", message: `Endpoint ${req.originalUrl} tidak ditemukan`, errors: [] });
}

// Express mengenali middleware error dari 4 parameternya (err, req, res, next)
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || "Terjadi kesalahan pada server";
  let errors = err.errors && Array.isArray(err.errors) ? err.errors : [];

  // Error validasi Mongoose: kumpulkan semua field yang salah
  if (err.name === "ValidationError") {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = "Data yang dikirim belum valid";
  }
  // Data duplikat (unique index), misalnya email sudah terdaftar
  if (err.code === 11000) {
    status = 409;
    const fields = Object.keys(err.keyValue || {});
    errors = fields.map((field) => ({ field, message: "Data ini sudah ada" }));
    message = "Data sudah ada";
  }
  // ID tidak dikenali atau tipe data salah
  if (err.name === "CastError") {
    status = 400;
    errors = [{ field: err.path, message: "Format tidak valid" }];
    message = "Format data tidak valid";
  }
  // Body JSON rusak
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Format JSON tidak valid";
  }

  if (status >= 500) {
    console.error(err); // detail teknis hanya di terminal (log), tidak dikirim ke pengguna
    message = "Terjadi kesalahan pada server. Silakan coba lagi.";
    errors = [];
  }
  res.status(status).json({ status: "error", message, errors });
}

module.exports = { notFound, errorHandler };
