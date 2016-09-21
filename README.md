![Build Status](https://travis-ci.org/xpepermint/mongodb-quota.svg?branch=master)&nbsp;[![NPM Version](https://badge.fury.io/js/typeable.svg)](https://badge.fury.io/js/typeable)&nbsp;[![Dependency Status](https://gemnasium.com/xpepermint/mongodb-quota.svg)](https://gemnasium.com/xpepermint/mongodb-quota)

# [mongodb]-quota

> General-purpose quota management for MongoDB.

## Install

This is a module for [Node.js](http://nodejs.org) and is installed via [npm](https://www.npmjs.com/).

```
$ npm install --save mongodb-quota
```

## Example

```js
import {MongoClient} from 'mongodb';
import {grant} from 'mongodb-quota';

(async function() {

  let mongo = await MongoClient.connect('mongodb://localhost:27017/test');

  let quota = new Quota({
    collection: mongo.collection('quotas'),
    namespace: 'worker1'
  });

  await quota.setup(); // run this only one time

  try {
    quota.grant('github-api', [ // an array or a single object
      {ttl: quota.MINUTELY_TTL, inc: 1},
      {ttl: quota.HOURLY_TTL, inc: 1},
      {ttl: quota.DAILY_TTL, inc: 1}
    ]);
  } catch(e) {
    console.log(e.continueAt);
  }

})().catch(console.error);
```

## API

**new Quota(options)**

> A core class which is used for checking quotas.

| Option | Type | Required | Default | Description
|********|******|**********|*********|************
| collection | Object | Yes | - | MongoDB collection object.
| namespace | String | No | - | When present, only records with specified namespace will be checked.

**quota.flush(key, ttl)**:Promise
> Removes all key quotas.

| Option | Type | Required | Default | Description
|********|******|**********|*********|************
| key | String | Yes | - | Quota unique name.
| ttl | Integer | No | - | Only applies to quotas of a specific duration.

**quota.grant(key, [{ttl, inc, uot}])**:Promise

> Verifies key quota or throws the QuotaError.

| Option | Type | Required | Default | Description
|********|******|**********|*********|************
| key | String | Yes | - | Quota unique name.
| ttl | Integer | Yes | - | Quota duration in [ms].
| inc | Integer | No | 0 | Increment quota key by `inc` value. Note that in case of an array, affested quotas are automatically decremented.

**quota.setup()**:Promise
> Installs MongoDB collection indexes.

## License (MIT)

```
Copyright (c) 2016 Kristijan Sedlak <xpepermint@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
