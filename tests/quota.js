const {MongoClient} = require('mongodb');
const test = require('ava');
const {Quota} = require('../dist');

test.beforeEach(async (t) => {
  t.context.mongo = await MongoClient.connect('mongodb://localhost:27017/test');
  t.context.collection = t.context.mongo.collection('quotas');
});

test.afterEach(async (t) => {
  await t.context.mongo.close();
  t.context.collection = null;
  t.context.mongo = null;
});

test('setup', async (t) => {
  let collection = t.context.collection;
  let quota = new Quota({collection});

  try {
    await collection.drop();
  } catch(e) {}
  await quota.setup();

  let exist = await collection.indexExists(['liveUntilTTL', 'namespaceKeyDurationPerformance']);
  t.is(exist, true);
});

test('grant (a single option)', (t) => {
  t.pass();
});

test('grant (an array options)', (t) => {
  t.pass();
});

test('grant (namespace)', (t) => {
  t.pass();
});

test('flush (all)', (t) => {
  t.pass();
});

test('flush (by ttl)', (t) => {
  t.pass();
});

test('flush (namespace', (t) => {
  t.pass();
});
