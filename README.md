TokenThrottle
=============

[![NPM](https://nodei.co/npm/tokenthrottle.png)](https://nodei.co/npm/tokenthrottle/)

Asynchronously rate-limit by a key. E.g. set thresholds for access to your API by username/token, or IP address.

The default storage is in process memory, but it is easily pluggable by providing a thin wrapper to whatever storage system you would like to use, e.g. Redis for cross-process or cross-machine rate-limiting.

```javascript
// Create a throttle with 100 access limit per second.
var throttle = require("tokenthrottle")({rate: 100});


// in some_function that you want to rate limit
  throttle.rateLimit(id, function (err, limited) {
    /* ... handle err ... */
    if (limited) {
      return res.next(new Error("Rate limit exceeded, please slow down."));
    }
    else {
      /* ... do work ... */
    }
  })

```

Wrappers
========

Convenient wrappers for this library with different storage back-ends:

* Redis: [tokenthrottle-redis](http://npm.im/tokenthrottle-redis)
* LevelDb: [tokenthrottle-level](http://npm.im/tokenthrottle-level)

Options
=======

There are a number of options available to control how the throttle mechanism works.

* rate: {Number} REQUIRED The number of actions to renew during each time window
* burst: {Number} A maximum number of actions allowed per time window [default: rate]
* window: {Number} The milliseconds in which `rate` or `burst` act. [default: 1000]
* tokensTable: {TokensTable} A table implementation that supports `put(key, object, cb)` and `get(key, cb)`
* overrides: {Object} A set of overrides to apply when throttling. e.g.

```javascript
var throttle = require("tokenthrottle")({
  rate: 100,       // replenish actions at 100 per minute
  burst: 200,      // allow a maximum burst of 200 actions per minute
  window: 60000,   // set the throttle window to a minute
  overrides: {
    "127.0.0.1": {rate: 0}, // No limit for localhost
    "Joe Smith": {rate: 10}, // token "Joe Smith" gets 10 actions per second (Note defaults apply here, does not inherit)
    "2da0f39": {rate: 1000, burst: 2000, window: 1000}, // Allow a lot more actions to this token.
  }
});
```

Custom Token Table
==================

Here's an example of a custom token table that would use Redis:

(But don't do it manually, use [tokenthrottle-redis](http://npm.im/tokenthrottle-redis))

```javascript
function RedisTable(redisClient) {
  this.client = redisClient;
}
RedisTable.prototype.get = function (key, cb) {
  this.client.hgetall(key, cb);
}
RedisTable.prototype.put = function (key, value, cb) {
  this.client.hmset(key, value, cb);
  // Note: you may want to consider expiring these keys to prevent Redis memory bloat.
}

var throttle = require("tokenthrottle")({
  rate: 100,
  tokensTable: new RedisTable(require("redis").createClient())
})
```

History
=======

This library is code derived from the original built-in throttle for [restify](http://github.com/mcavage/node-restify) and contains many portions originally written by Mark Cavage. It is actually designed with Restify backward-compatibility in mind for Synchronous in-memory only token-table implementations by wrapping synchronous put/get calls with async versions.

License
=======

(The MIT License)

Copyright (c) Bryce B. Baril <bryce@ravenwall.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
