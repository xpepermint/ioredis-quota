"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const quota = require("..");
ava_1.default("exposed content", (t) => {
    t.is(!!quota.Quota, true);
    t.is(!!quota.QuotaError, true);
});
//# sourceMappingURL=index.js.map