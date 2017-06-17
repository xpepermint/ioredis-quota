"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const errors_1 = require("./errors");
class Quota {
    constructor({ redis, prefix = "quota", rates = [] }) {
        this.redis = redis;
        this.prefix = prefix;
        this.rates = rates;
    }
    buildIdentifier(ident) {
        let timestamp = moment().startOf(ident.unit).toDate().getTime();
        return [this.prefix, timestamp, `<${ident.key}>`].join("-");
    }
    parseIdentifier(identifier) {
        let parts = identifier.split("-");
        return {
            prefix: parts[0],
            timestamp: parseInt(parts[1]),
            key: parts[2].slice(1, -1),
        };
    }
    flush(idents = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(idents)) {
                idents = [idents];
            }
            if (idents.length === 0) {
                idents = this.rates.concat([]);
            }
            let dels = [];
            for (let ident of idents) {
                let identifier = this.buildIdentifier(ident);
                dels.push(["del", identifier]);
            }
            yield this.redis.multi(dels).exec();
        });
    }
    grant(rates = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(rates)) {
                rates = [rates];
            }
            rates = this.rates.concat(rates);
            let identifiers = [];
            let grants = [];
            for (let rate of rates) {
                let identifier = this.buildIdentifier(rate);
                identifiers.push(identifier);
                let ttl = moment(0).add(1, rate.unit).unix() * 1000;
                grants.push(["set", identifier, "0", "PX", ttl, "NX"]);
                grants.push(["incrby", identifier, 1]);
            }
            let res = yield this.redis.multi(grants).exec();
            let values = res.map(v => v[1]).splice(1).filter(v => v !== null);
            let nextDate = null;
            for (let i in rates) {
                let value = values[i];
                let { limit, unit } = rates[i];
                let identifier = identifiers[i];
                if (!(value <= limit)) {
                    let { timestamp } = this.parseIdentifier(identifier);
                    let possibleMoment = moment(timestamp).add(1, unit);
                    if (nextDate === null || possibleMoment.isBefore(nextDate)) {
                        nextDate = possibleMoment.toDate();
                    }
                    break;
                }
            }
            if (nextDate === null) {
                return;
            }
            let rollbacks = [];
            for (let identifier of identifiers) {
                rollbacks.push(["set", identifier, "0", "PX", 1, "NX"]);
                rollbacks.push(["incrby", identifier, -1]);
            }
            yield this.redis.multi(rollbacks).exec();
            throw new errors_1.QuotaError(nextDate);
        });
    }
    schedule(rates = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.grant(rates);
                return new Date();
            }
            catch (e) {
                if (e instanceof errors_1.QuotaError) {
                    return e.nextDate;
                }
                else {
                    throw e;
                }
            }
        });
    }
}
exports.Quota = Quota;
//# sourceMappingURL=quota.js.map