'use strict';

exports.QuotaError = class extends Error {
  constructor(quota, message) {
    super(message);

    Object.defineProperty(this, 'name', {
      value: this.constructor.name,
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, 'message', {
      value: message,
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, 'code', {
      value: 503,
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, 'appliesUntil', {
      value: 503,
      enumerable: true // expose as object key
    });
  }
};