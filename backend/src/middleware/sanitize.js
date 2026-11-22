// Keamanan input (NFR Keamanan):
// 1) rejectMongoOperators: menolak kunci yang diawali "$" atau mengandung "." (contoh: {"password": {"$ne": ""}})
// 2) sanitizeBody: membersihkan tag HTML berbahaya (misalnya <script>) dari semua teks di body
const xss = require("xss");

const SKIP_FIELDS = ["password", "currentPassword", "newPassword"]; // password tidak diubah

function hasForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (value && typeof value === "object") {
    return Object.keys(value).some((key) => key.startsWith("$") || key.includes(".") || hasForbiddenKey(value[key]));
  }
  return false;
}

function rejectMongoOperators(req, res, next) {
  if (hasForbiddenKey(req.body) || hasForbiddenKey(req.query)) {
    return res.status(400).json({
      status: "error",
      message: "Input mengandung karakter yang tidak diizinkan",
      errors: [{ field: "body", message: "Operator database tidak boleh dikirim" }],
    });
  }
  next();
}

function clean(value, key) {
  if (typeof value === "string") return SKIP_FIELDS.includes(key) ? value : xss(value);
  if (Array.isArray(value)) return value.map((item) => clean(item, key));
  if (value && typeof value === "object") {
    const result = {};
    for (const [k, v] of Object.entries(value)) result[k] = clean(v, k);
    return result;
  }
  return value;
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") req.body = clean(req.body);
  next();
}

module.exports = { rejectMongoOperators, sanitizeBody };
