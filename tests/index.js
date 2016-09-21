const test = require('ava');
const quota = require('../dist');

test('exposed content', (t) => {
  t.is(!!quota.Quota, true);
  t.is(!!quota.QuotaError, true);
});
