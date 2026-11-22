// Mengambil hanya field yang diizinkan dari req.body.
// Mencegah pengguna mengirim field berbahaya, misalnya { "role": "admin" } saat registrasi.
function pick(source, allowedFields) {
  const result = {};
  for (const field of allowedFields) {
    if (source && source[field] !== undefined) result[field] = source[field];
  }
  return result;
}

module.exports = pick;
