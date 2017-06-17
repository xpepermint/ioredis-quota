import * as Redis from "ioredis";
import test from "ava";
import { Quota, QuotaError } from "../..";
import { promise as sleep } from "es6-sleep";
import * as moment from "moment";

test.beforeEach(async (t) => {
  t.context.redis = new Redis();
  await t.context.redis.flushdb();
});

test.afterEach(async (t) => {
  await t.context.redis.flushdb();
  await t.context.redis.quit();
  t.context.redis = null;
});

test.serial("method `buildIdentifier()` builds redis key", async (t) => {
  let redis = t.context.redis;
  let timestamp = moment().startOf("minute").toDate().getTime();
  let identifier = ["quota", timestamp, `<foo>`].join("-");

  let quota = new Quota({ redis });
  t.is(quota.buildIdentifier({key: "foo", unit: "minute"}), identifier);
});

test.serial("method `parseIdentifier()` parses redis key", async (t) => {
  let redis = t.context.redis;
  let timestamp = moment().startOf("minute").unix();
  let identifier = ["quota", timestamp, `<foo>`].join("-");

  let quota = new Quota({ redis });
  t.deepEqual(quota.parseIdentifier(identifier), {
    prefix: "quota",
    timestamp: timestamp,
    key: "foo"
  });
});

test.serial("method `grant()` throws error when quota size is exceeded", async (t) => {
  let quota = new Quota({
    redis: t.context.redis,
    rates: [{ key: "foo", unit: "minute", limit: 2 }],
  });
  let times = 0;
  let error = null;
  try {
    await quota.grant();
    times++;
    await quota.grant();
    times++;
    await quota.grant();
    times++;
  } catch (e) {
    error = e;
  }
  t.is(times, 2);
  t.is(error instanceof QuotaError, true);
});

test.serial("method `grant()` accepts additional rates as argument", async (t) => {
  let redis = t.context.redis;
  let quota = new Quota({
    redis,
    rates: [{ key: "foo", unit: "second", limit: 2 }],
  });
  let error = null;
  try {
    await quota.grant({ key: "foo", unit: "minute", limit: 0 });
  } catch (e) {
    error = e;
  }
  t.is(error instanceof QuotaError, true);
});

test.serial("method `grant()` error provides nextDate value", async (t) => {
  let redis = t.context.redis;
  let quota = new Quota({
    redis,
    rates: [{ key: "foo", unit: "month", limit: 1 }],
  });
  let expectedMoment = moment().startOf("month").add(1, "month");
  let nextDate = null;
  try {
    await quota.grant();
    await quota.grant();
  } catch (e) {
    nextDate = e.nextDate;
  }
  t.is(expectedMoment.isSame(nextDate), true);
});

test.serial("method `grant()` uses TTL for determing current quota size", async (t) => {
  let redis = t.context.redis;
  let quota = new Quota({
    redis,
    rates: [{ key: "foo", unit: "second", limit: 1 }],
  });
  try {
    await quota.grant();
    await sleep(1001);
    await quota.grant();
    t.pass();
  } catch (e) {
    t.fail();
  }
});

test.serial("method `grant()` rollbacks previouslly incremented records if quota size is exceeded", async (t) => {
  let redis = t.context.redis;
  let quota = new Quota({ redis });
  let value = null;
  try {
    await quota.grant({ key: "foo", unit: "year", limit: 1 });
    await quota.grant([
      { key: "foo", unit: "year", limit: 2 }, // second grant that means 3th call
      { key: "foo", unit: "year", limit: 2 } // third grant that means 3th call
    ]);
  } catch (e) {
    value = await redis.get(quota.buildIdentifier({ key: "foo", unit: "year" }));
  }
  t.is(value, "1");
});

test("method `flush()` deletes quotas", async (t) => {
  let redis = t.context.redis;

  let quota = new Quota({ redis });
  await quota.grant({ key: "foo0", unit: "year", limit: 10 });
  await quota.grant({ key: "foo1", unit: "year", limit: 10 });
  await quota.grant({ key: "foo2", unit: "year", limit: 10 });
  await quota.flush({ key: "foo0", unit: "year" });
  await quota.flush({ key: "foo2", unit: "year" });

  let value0 = await redis.get(quota.buildIdentifier({ key: "foo0", unit: "year" }));
  let value1 = await redis.get(quota.buildIdentifier({ key: "foo1", unit: "year" }));
  let value2 = await redis.get(quota.buildIdentifier({ key: "foo2", unit: "year" }));
  t.is(!!value0, false);
  t.is(!!value1, true);
  t.is(!!value2, false);
});

test.serial("method `schedule()` return the next available date", async (t) => {
  let redis = t.context.redis;

  let quota = new Quota({ redis });
  let error = null;

  await quota.schedule({ key: "foo", unit: "minute", limit: 1});
  let date = await quota.schedule({ key: "foo", unit: "minute", limit: 1});

  t.is(moment(date).diff(moment().startOf("minute")) === 60000, true);
});
