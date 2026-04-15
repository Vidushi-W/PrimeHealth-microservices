function notFound(req, res, _next) {
  res.status(404).json({
    success: false,
    message: `Not found: ${req.method} ${req.originalUrl}`,
    data: null
  });
}

module.exports = notFound;
