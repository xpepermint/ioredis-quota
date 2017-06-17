![Build Status](https://travis-ci.org/xpepermint/ioredis-quota.svg?branch=master)&nbsp;[![NPM Version](https://badge.fury.io/js/ioredis-quota.svg)](https://badge.fury.io/js/ioredis-quota)&nbsp;[![Dependency Status](https://gemnasium.com/xpepermint/ioredis-quota.svg)](https://gemnasium.com/xpepermint/ioredis-quota)

# [ioredis](https://github.com/luin/ioredis)-quota

> General-purpose quota management.

This NPM package is a simple quota manager with a simple, promisified API. It's open-source and it's written with  [TypeScript](https://www.typescriptlang.org).

The source code is available on [GitHub](https://github.com/xpepermint/ioredis-quota) where you can also find our [issue tracker](https://github.com/xpepermint/ioredis-quota/blob/master/issues).

## Install

The package depends on [ioredis](https://github.com/luin/ioredis) but it should also work with any other [Redis](http://redis.io) library that supports promises.

```
$ npm install --save ioredis ioredis-quota
```

## Getting Started

To make the code clean, the examples are written in [TypeScript](https://www.typescriptlang.org/).

You start by some initialization code.

```js
import Redis from "ioredis";
import { Quota } from "ioredis-quota";

const redis = new Redis();
const quota = new Quota({ redis });
```

Use the `grant()` method to verify that the request you are making does not exceed the rate limit.

```js
try {
  await quota.grant([ // List of options (atomic).
    { key: "github-api", unit: "minute", limit: 10 }, // Allow up to 10 requests per minute.
    { key: "github-api", unit: "hour", limit: 100 },  // Allow up to 100 requests per hour.
    { key: "github-api", unit: "day", limit: 1000 },  // Allow up to 1000 requests per day.
  ]);
  // We have not exceeded the minutely, hourly nor daily quota so we can execute a request.
} catch (e) {
  // We reached the limits. Use `e.nextDate` to handle a retry.
}
```

Or use the `schedule()` method which uses the `grant()` method and returns the next appropriate date for execution (`e.nextDate`) instead of throwing an error.

```js
const nextDate = await quota.schedule([ // List of options (atomic).
  { key: "github-api", unit: "minute", limit: 10 }, // Allow up to 10 requests per minute.
  { key: "github-api", unit: "hour", limit: 100 },  // Allow up to 100 requests per hour.
  { key: "github-api", unit: "day", limit: 1000 },  // Allow up to 1000 requests per day.
]); // -> Sat Jun 17 14:58:57 CEST 2017
```

## API

**Quota({ redis, prefix })**

> A core class which is used for checking quota.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| redis | Object | Yes | - | Redis class instance.
| prefix | String | No | quota | A string which prefix all the keys.

**QuotaError(nextDate, message)**

> Quota error class which is thrown when the `grant` method does not succeed.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| nextDate | Date | Yes | - | A moment when quota is reset.
| message | String | No | Quota limit exceeded. | Error message.

**quota.buildIdentifier({ key, unit })**: String
> Builds and returns the final Redis key.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| key | String | Yes | - | Quota key name.
| unit | String | Yes | - | Quota unit (`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter` or `year`).

**quota.flush([{ key, limit }])**: Promise
> Atomically removes quota.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| key | String | Yes | - | Quota key name.
| unit | String | Yes | - | Quota unit (`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter` or `year`).

**quota.grant([{ key, limit, unit }])**: Promise<void>

> Atomically verifies quota for each key and throws the QuotaError if the record's increment exceeds the specified limit attribute.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| key | String | Yes | - | Quota unique name.
| unit | String | Yes | - | Quota unit (`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter` or `year`).
| limit | Integer | Yes | - | The maximum value of the increment.

**quota.parseIdentifier(identifier)**: String

> Parses the identifier string and returns key's data (prefix, timestamp and key).

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| identifier | String | Yes | - | Redis key.

**quota.schedule([{ key, limit, unit }])**: Promise<Date>

> Atomically verifies quota for each key and returns the next available date.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| key | String | Yes | - | Quota unique name.
| unit | String | Yes | - | Quota unit (`second`, `minute`, `hour`, `day`, `week`, `month`, `quarter` or `year`).
| limit | Integer | Yes | - | The maximum value of the increment.

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
