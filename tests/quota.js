const Redis = require('ioredis');
const test = require('ava');
const {Quota, QuotaError} = require('../dist');
const sleep = require('es6-sleep').promise;
const moment = require('moment');

test.beforeEach(async (t) => {
  t.context.redis = new Redis();
  await t.context.redis.flushdb();
});

test.afterEach(async (t) => {
  await t.context.redis.flushdb();
  await t.context.redis.quit();
  t.context.redis = null;
});

test.serial('buildIdentifier()', async (t) => {
  let redis = t.context.redis;
  let timestamp = moment().startOf('minute').toDate().getTime();
  let identifier = ['quota', timestamp, `<foo>`].join('-');

  let quota = new Quota({redis});
  t.is(quota.buildIdentifier({key: 'foo', unit: 'minute'}), identifier);
});

test.serial('parseIdentifier()', async (t) => {
  let redis = t.context.redis;
  let timestamp = moment().startOf('minute').unix();
  let identifier = ['quota', timestamp, `<foo>`].join('-');

  let quota = new Quota({redis});
  t.deepEqual(quota.parseIdentifier(identifier), {
    prefix: 'quota',
    timestamp: timestamp,
    key: 'foo'
  });
});

test.serial('grant() throws error when quota size is exceeded', async (t) => {
  let redis = t.context.redis;

  let quota = new Quota({redis});
  let error = null;
  try {
    await quota.grant({key: 'foo', unit: 'minute', limit: 2});
    await quota.grant([
      {key: 'foo', unit: 'minute', limit: 2},
      {key: 'foo', unit: 'minute', limit: 2}
    ]);
  } catch(e) {
    error = e;
  }
  t.is(error instanceof QuotaError, true);
});

test.serial('grant() error provides nextDate value', async (t) => {
  let redis = t.context.redis;

  let quota = new Quota({redis});
  let expectedMoment = moment().startOf('month').add(1, 'month');
  let nextDate = null;
  try {
    await quota.grant({key: 'foo', unit: 'month', limit: 1});
    await quota.grant({key: 'foo', unit: 'month', limit: 1});
  } catch(e) {
    nextDate = e.nextDate;
  }
  t.is(expectedMoment.isSame(nextDate), true);
});

test.serial('grant() uses TTL for determing current quota size', async (t) => {
  let redis = t.context.redis;

  let quota = new Quota({redis});
  try {
    await quota.grant({key: 'foo', unit: 'second', limit: 1});
    await sleep(1001);
    await quota.grant({key: 'foo', unit: 'second', limit: 1});
    t.pass();
  } catch(e) {
    t.fail();
  }
});

test.serial('grant() rollbacks previouslly incremented records if quota size is exceeded', async (t) => {
  let redis = t.context.redis;

  let quota = new Quota({redis});
  let value = null;
  try {
    await quota.grant({key: 'foo', unit: 'year', limit: 1});
    await quota.grant([
      {key: 'foo', unit: 'year', limit: 2},
      {key: 'foo', unit: 'year', limit: 2}
    ]);
  } catch(e) {
    value = await redis.get(quota.buildIdentifier({key: 'foo', unit: 'year'}));
  }
  t.is(value, '1');
});

test('flush() delets quota', async (t) => {
  let redis = t.context.redis;

  let quota = new Quota({redis});
  await quota.grant({key: 'foo0', unit: 'year', limit: 10});
  await quota.grant({key: 'foo1', unit: 'year', limit: 10});
  await quota.grant({key: 'foo2', unit: 'year', limit: 10});
  await quota.flush({key: 'foo0', unit: 'year'});
  await quota.flush({key: 'foo2', unit: 'year'});

  let value0 = await redis.get(quota.buildIdentifier({key: 'foo0', unit: 'year'}));
  let value1 = await redis.get(quota.buildIdentifier({key: 'foo1', unit: 'year'}));
  let value2 = await redis.get(quota.buildIdentifier({key: 'foo2', unit: 'year'}));
  t.is(!!value0, false);
  t.is(!!value1, true);
  t.is(!!value2, false);
});
