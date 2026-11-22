// Format respons sukses yang seragam (SRS 3.3):
// { status: "success", message, data, pagination? }
function sendSuccess(res, { statusCode = 200, message = "Berhasil", data = null, pagination } = {}) {
  const body = { status: "success", message, data };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

// Membaca ?page=&limit= dari query dengan batas aman
function getPagination(query, defaultLimit = 10) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function buildPagination(page, limit, total) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

module.exports = { sendSuccess, getPagination, buildPagination };
