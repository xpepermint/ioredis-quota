import test from "ava";
import * as quota from "..";

test("exposed content", (t) => {
  t.is(!!quota.Quota, true);
  t.is(!!quota.QuotaError, true);
});
