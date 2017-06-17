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
    constructor({ redis, prefix = "quota", }) {
        this.redis = redis;
        this.prefix = prefix;
    }
    buildIdentifier({ key, unit }) {
        let timestamp = moment().startOf(unit).toDate().getTime();
        return [this.prefix, timestamp, `<${key}>`].join("-");
    }
    parseIdentifier(identifier) {
        let parts = identifier.split("-");
        return {
            prefix: parts[0],
            timestamp: parseInt(parts[1]),
            key: parts[2].slice(1, -1),
        };
    }
    flush(options = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(options)) {
                options = [options];
            }
            let dels = [];
            for (let option of options) {
                let identifier = this.buildIdentifier(option);
                dels.push(["del", identifier]);
            }
            yield this.redis.multi(dels).exec();
        });
    }
    grant(options = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(options)) {
                options = [options];
            }
            let identifiers = [];
            let grants = [];
            for (let option of options) {
                let identifier = this.buildIdentifier(option);
                identifiers.push(identifier);
                let { key, limit = 1, unit } = option;
                let ttl = moment(0).add(1, unit).unix() * 1000;
                grants.push(["set", identifier, "0", "PX", ttl, "NX"]);
                grants.push(["incrby", identifier, 1]);
            }
            let res = yield this.redis.multi(grants).exec();
            let values = res.map(v => v[1]).splice(1).filter(v => v !== null);
            let nextDate = null;
            for (let i in options) {
                let value = values[i];
                let { limit, unit } = options[i];
                let identifier = identifiers[i];
                if (value > limit) {
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
    schedule(options = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.grant(options);
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