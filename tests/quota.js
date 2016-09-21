const {MongoClient} = require('mongodb');
const test = require('ava');
const {Quota, QuotaError} = require('../dist');
const sleep = require('es6-sleep').promise;

test.beforeEach(async (t) => {
  t.context.mongo = await MongoClient.connect('mongodb://localhost:27017/test');
  t.context.collection = t.context.mongo.collection('quotas');
});

test.afterEach(async (t) => {
  await t.context.mongo.close();
  t.context.collection = null;
  t.context.mongo = null;
});

test.serial('setup()', async (t) => {
  let collection = t.context.collection;

  let quota = new Quota({collection});
  try {
    await collection.drop();
  } catch(e) {}
  await quota.setup();

  let exist = await collection.indexExists(['expireAtTTL', 'namespaceKeyDurationPerformance']);
  t.is(exist, true);
});

test.serial('grant() throws error when quota size is exceeded', async (t) => {
  let collection = t.context.collection;
  await collection.deleteMany({});

  let quota = new Quota({collection});
  await quota.setup();

  let error = null;
  try {
    await quota.grant({key: 'foo', ttl: 5000, size: 1});
    await quota.grant({key: 'foo', ttl: 5000, size: 4, inc: 3});
    await quota.grant({key: 'foo', ttl: 5000, size: 4, inc: 2});
  } catch(e) {
    error = e;
  }
  t.is(error instanceof QuotaError, true);
});

test.serial('grant() uses TTL for determing current quota size', async (t) => {
  let collection = t.context.collection;
  await collection.deleteMany({});

  let quota = new Quota({collection});
  await quota.setup();

  try {
    await quota.grant({key: 'foo', ttl: 5000, size: 1, inc: 1});
    await sleep(61000);
    await quota.grant({key: 'foo', ttl: 5000, size: 1, inc: 1});
    t.pass();
  } catch(e) {
    t.fail();
  }
});

test.serial('grant() rollbacks previouslly incremented records if quota size is exceeded', async (t) => {
  let collection = t.context.collection;
  await collection.deleteMany({});

  let quota = new Quota({collection});
  await quota.setup();

  let record = null;
  try {
    await quota.grant({key: 'foo', ttl: 5000, size: 4, inc: 1});
    await quota.grant([
      {key: 'foo', ttl: 5000, size: 4, inc: 1},
      {key: 'foo', ttl: 5000, size: 4, inc: 1},
      {key: 'foo', ttl: 5000, size: 4, inc: 2}
    ]);
  } catch(e) {
    record = await collection.findOne({namespace: null, key: 'foo', ttl: 5000});
  }
  t.is(record.value, 1);
});

test.serial('grant() ignores other records if namespace is set', async (t) => {
  let collection = t.context.collection;
  await collection.deleteMany({});

  let quota0 = new Quota({collection});
  let quota1 = new Quota({collection, namespace: 'bar'});
  await quota0.setup();

  try {
    await quota0.grant({key: 'foo', ttl: 5000, size: 4, inc: 4});
    await quota1.grant({key: 'foo', ttl: 5000, size: 4, inc: 4});
    t.pass();
  } catch(e) {
    t.fail();
  }
});

// test('flush() - all', (t) => {
//   t.pass();
// });
//
// test('flush() - by ttl', (t) => {
//   t.pass();
// });
//
// test('flush() - by namespace', (t) => {
//   t.pass();
// });
