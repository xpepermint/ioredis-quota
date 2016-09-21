'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
class QuotaError extends Error {
  constructor(nextDate) {
    let message = arguments.length <= 1 || arguments[1] === undefined ? 'Grant limit exceeded.' : arguments[1];

    super(message);

    Object.defineProperty(this, 'name', {
      value: this.constructor.name,
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, 'message', {
      value: message,
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, 'nextDate', {
      value: nextDate,
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, 'code', {
      value: 503,
      enumerable: true // expose as object key
    });
  }
}
exports.QuotaError = QuotaError;