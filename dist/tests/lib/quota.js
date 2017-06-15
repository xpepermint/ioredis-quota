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
const Redis = require("ioredis");
const ava_1 = require("ava");
const __1 = require("../..");
const es6_sleep_1 = require("es6-sleep");
const moment = require("moment");
ava_1.default.beforeEach((t) => __awaiter(this, void 0, void 0, function* () {
    t.context.redis = new Redis();
    yield t.context.redis.flushdb();
}));
ava_1.default.afterEach((t) => __awaiter(this, void 0, void 0, function* () {
    yield t.context.redis.flushdb();
    yield t.context.redis.quit();
    t.context.redis = null;
}));
ava_1.default.serial("method `buildIdentifier()` builds redis key", (t) => __awaiter(this, void 0, void 0, function* () {
    let redis = t.context.redis;
    let timestamp = moment().startOf("minute").toDate().getTime();
    let identifier = ["quota", timestamp, `<foo>`].join("-");
    let quota = new __1.Quota({ redis });
    t.is(quota.buildIdentifier({ key: "foo", unit: "minute" }), identifier);
}));
ava_1.default.serial("method `parseIdentifier()` parses redis key", (t) => __awaiter(this, void 0, void 0, function* () {
    let redis = t.context.redis;
    let timestamp = moment().startOf("minute").unix();
    let identifier = ["quota", timestamp, `<foo>`].join("-");
    let quota = new __1.Quota({ redis });
    t.deepEqual(quota.parseIdentifier(identifier), {
        prefix: "quota",
        timestamp: timestamp,
        key: "foo"
    });
}));
ava_1.default.serial("method `grant()` throws error when quota size is exceeded", (t) => __awaiter(this, void 0, void 0, function* () {
    let redis = t.context.redis;
    let quota = new __1.Quota({ redis });
    let error = null;
    try {
        yield quota.grant({ key: "foo", unit: "minute", limit: 2 });
        yield quota.grant([
            { key: "foo", unit: "minute", limit: 2 },
            { key: "foo", unit: "minute", limit: 2 }
        ]);
    }
    catch (e) {
        error = e;
    }
    t.is(error instanceof __1.QuotaError, true);
}));
ava_1.default.serial("method `grant()` error provides nextDate value", (t) => __awaiter(this, void 0, void 0, function* () {
    let redis = t.context.redis;
    let quota = new __1.Quota({ redis });
    let expectedMoment = moment().startOf("month").add(1, "month");
    let nextDate = null;
    try {
        yield quota.grant({ key: "foo", unit: "month", limit: 1 });
        yield quota.grant({ key: "foo", unit: "month", limit: 1 });
    }
    catch (e) {
        nextDate = e.nextDate;
    }
    t.is(expectedMoment.isSame(nextDate), true);
}));
ava_1.default.serial("method `grant()` uses TTL for determing current quota size", (t) => __awaiter(this, void 0, void 0, function* () {
    let redis = t.context.redis;
    let quota = new __1.Quota({ redis });
    try {
        yield quota.grant({ key: "foo", unit: "second", limit: 1 });
        yield es6_sleep_1.promise(1001);
        yield quota.grant({ key: "foo", unit: "second", limit: 1 });
        t.pass();
    }
    catch (e) {
        t.fail();
    }
}));
ava_1.default.serial("method `grant()` rollbacks previouslly incremented records if quota size is exceeded", (t) => __awaiter(this, void 0, void 0, function* () {
    let redis = t.context.redis;
    let quota = new __1.Quota({ redis });
    let value = null;
    try {
        yield quota.grant({ key: "foo", unit: "year", limit: 1 });
        yield quota.grant([
            { key: "foo", unit: "year", limit: 2 },
            { key: "foo", unit: "year", limit: 2 }
        ]);
    }
    catch (e) {
        value = yield redis.get(quota.buildIdentifier({ key: "foo", unit: "year" }));
    }
    t.is(value, "1");
}));
ava_1.default("method `flush()` deletes quotas", (t) => __awaiter(this, void 0, void 0, function* () {
    let redis = t.context.redis;
    let quota = new __1.Quota({ redis });
    yield quota.grant({ key: "foo0", unit: "year", limit: 10 });
    yield quota.grant({ key: "foo1", unit: "year", limit: 10 });
    yield quota.grant({ key: "foo2", unit: "year", limit: 10 });
    yield quota.flush({ key: "foo0", unit: "year" });
    yield quota.flush({ key: "foo2", unit: "year" });
    let value0 = yield redis.get(quota.buildIdentifier({ key: "foo0", unit: "year" }));
    let value1 = yield redis.get(quota.buildIdentifier({ key: "foo1", unit: "year" }));
    let value2 = yield redis.get(quota.buildIdentifier({ key: "foo2", unit: "year" }));
    t.is(!!value0, false);
    t.is(!!value1, true);
    t.is(!!value2, false);
}));
ava_1.default.serial("method `run()` executed a code block based on quota settings", (t) => __awaiter(this, void 0, void 0, function* () {
    let redis = t.context.redis;
    let quota = new __1.Quota({ redis });
    let value = 0;
    let increment = () => __awaiter(this, void 0, void 0, function* () { return value++; });
    try {
        yield quota.run({ key: "foo", unit: "minute", limit: 2 }, increment);
        yield quota.run({ key: "foo", unit: "minute", limit: 2 }, increment);
        yield quota.run({ key: "foo", unit: "minute", limit: 2 }, increment);
    }
    catch (e) { }
    t.is(value, 2);
}));
//# sourceMappingURL=quota.js.map