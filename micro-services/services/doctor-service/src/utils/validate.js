const { validationResult } = require('express-validator');
const ApiError = require('./ApiError');

function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return next(
    new ApiError(
      400,
      'Validation failed',
      result.array().map(({ msg, path, location, value }) => ({
        message: msg,
        field: path,
        location,
        value
      }))
    )
  );
}

module.exports = { validate };
