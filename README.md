![Build Status](https://travis-ci.org/xpepermint/ioredis-quota.svg?branch=master)&nbsp;[![NPM Version](https://badge.fury.io/js/ioredis-quota.svg)](https://badge.fury.io/js/ioredis-quota)&nbsp;[![Dependency Status](https://gemnasium.com/xpepermint/ioredis-quota.svg)](https://gemnasium.com/xpepermint/ioredis-quota)

# [ioredis](https://github.com/luin/ioredis)-quota

> General-purpose quota management.

## Install

This is a module for [Node.js](http://nodejs.org) and can be installed via [npm](https://www.npmjs.com/package/ioredis-quota). The package depends on [ioredis](https://github.com/luin/ioredis) but it should also work with any other [Redis](http://redis.io) library that supports promises.

```
$ npm install --save ioredis ioredis-quota
```

## Example

```js
import Redis from 'ioredis';
import {grant} from 'ioredis-quota';

(async function() {
  let redis = new Redis();

  let quota = new Quota({redis});
  try {
    quota.grant([ // list of options (atomic)
      {key: 'github-api', unit: 'minute', limit: 10}, // allow up to 10 grants per minute
      {key: 'github-api', unit: 'hour', limit: 100}, // allow up to 100 grants per hour
      {key: 'github-api', unit: 'day', limit: 1000} // allow up to 1000 grants per day
    ]);
  } catch(e) {
    console.log(e.nextDate);
  }

})().catch(console.error);
```

## API

**Quota({redis, prefix})**

> A core class which is used for checking quotas.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| redis | Object | Yes | - | Redis class instance.
| prefix | String | No | quota | A string which prefix all the keys.

**QuotaError(nextDate, message)**

> Quota error class which is thrown when the `grant` method does not succeed.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| nextDate | Date | Yes | - | A moment when quota is reset.
| message | String | No | Grant limit exceeded | Error message.

**quota.buildIdentifier({key, unit})**:String
> Builds and returns the final Redis key.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| key | String | Yes | - | Quota key name.
| unit | String | Yes | - | Quota period unit (`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter` or `year`).

**quota.flush([{key, limit}])**:Promise
> Atomically removes quotas.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| key | String | Yes | - | Quota key name.
| unit | String | Yes | - | Quota period unit (`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter` or `year`).

**quota.grant([{key, limit, unit}])**:Promise

> Atomically verifies quota for a key. It throws the QuotaError if the record's increment exceeds the specified size attribute.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| key | String | Yes | - | Quota unique name.
| unit | String | Yes | - | Quota period unit (`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter` or `year`).
| limit | Integer | Yes | - | The maximum value of the increment.

**quota.parseIdentifier(identifier)**:String
> Parses the identifier string and returns key data (prefix, timestamp and key).

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| identifier | String | Yes | - | Redis key.

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
