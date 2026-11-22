// Membuat object error yang membawa kode status HTTP dan daftar filed yang salah,jika ada
// Contoh:throw new HttpError(404, "Data tidak ditemukan", ["field1", "field2"]);
function HttpError(statusCode, message, errors = []) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.errors = errors;
    return error;
}

module.exports = HttpError;