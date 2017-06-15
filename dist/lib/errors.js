"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class QuotaError extends Error {
    constructor(nextDate, message = "Quota limit exceeded.") {
        super(message);
        Object.defineProperty(this, "name", {
            value: this.constructor["name"],
            enumerable: true
        });
        Object.defineProperty(this, "message", {
            value: message,
            enumerable: true
        });
        Object.defineProperty(this, "nextDate", {
            value: nextDate,
            enumerable: true
        });
        Object.defineProperty(this, "code", {
            value: 503,
            enumerable: true
        });
    }
}
exports.QuotaError = QuotaError;
//# sourceMappingURL=errors.js.map