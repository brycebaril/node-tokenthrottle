// Copyright 2012 Mark Cavage <mcavage@gmail.com> All rights reserved.
//           2013 Bryce B. Baril <bryce@ravenwall.com> All rights reserved.

module.exports = Throttle

var assert = require("assert-plus")

var TokenBucket = require("./token_bucket")
var TokenTable = require("./token_table")

/**
 * Creates an API rate limiter that can be plugged into the standard
 * restify request handling pipeline.
 *
 * This throttle gives you three options on which to throttle:
 * username, IP address and "X-Forwarded-For". IP/XFF is a /32 match,
 * so keep that in mind if using it.  Username takes the user specified
 * on req.username (which gets automagically set for supported Authorization
 * types; otherwise set it yourself with a filter that runs before this).
 *
 * In both cases, you can set a `burst` and a `rate` (in requests/seconds),
 * as an integer/float.  Those really translate to the `TokenBucket`
 * algorithm, so read up on that (or see the comments above...).
 *
 * In either case, the top level options burst/rate set a blanket throttling
 * rate, and then you can pass in an `overrides` object with rates for
 * specific users/IPs.  You should use overrides sparingly, as we make a new
 * TokenBucket to track each.
 *
 * On the `options` object ip and username are treated as an XOR.
 *
 * An example options object with overrides:
 *
 *  {
 *    burst: 10,  // Max 10 concurrent requests (if tokens)
 *    rate: 0.5,  // Steady state: 1 request / 2 seconds
 *    ip: true,   // throttle per IP
 *    overrides: {
 *      "192.168.1.1": {
 *        burst: 0,
 *        rate: 0    // unlimited
 *    }
 *  }
 *
 *
 * @param {Object} options required options with:
 *                   - {Number} burst (required).
 *                   - {Number} rate (required).
 *                   - {Number} window (optional, default: 1000) milliseconds
 *                              to consider for the throttle window.
 *                   - {Boolean} ip (optional) equivalent to:
 *                               key: function (req) {return req.connection.remoteAddress}
 *                   - {Boolean} username (optional) equivalent to:
 *                               key: function (req) {return req.username}
 *                   - {Boolean} xff (optional) equivalent to:
 *                               key: function (req) {return req.headers["x-forwarded-for"]}
 *                   - {Function} key (optional) a function (req) {return String}
 *                                specify the throttle key.
 *                   - {Object} overrides (optional).
 *                   - {Object} tokensTable: a storage engine this plugin will
 *                              use to store throttling keys -> bucket mappings.
 *                              If you don't specify this, the default is to
 *                              use an in-memory O(1) LRU, with 10k distinct
 *                              keys.  Any implementation just needs to support
 *                              put/get.
 *                   - {Number} maxKeys: If using the default implementation,
 *                              you can specify how large you want the table to
 *                              be.  Default is 10000.
 *                   - {String} message (optional).
 * @return {Function} of type f(req, res, next) to be plugged into a route.
 * @throws {TypeError} on bad input.
 */
//  function throttle(options) {
//   assert.object(options, "options")
//   assert.number(options.burst, "options.burst")
//   assert.number(options.rate, "options.rate")
//   if (!util.xor(options.ip, options.xff, options.username, options.key)) {
//     throw new Error("(ip ^ username ^ xff ^ key)")
//   }
//   var key = options.key
//   if (options.ip) {
//     key = function (req) { return req.connection.remoteAddress }
//   }
//   if (options.xff) {
//     key = function (req) { return req.headers["x-forwarded-for"] }
//   }
//   if (options.username) {
//     key = function (req) { return req.username }
//   }

//   var burst = options.burst
//   var rate = options.rate
//   var window = options.window || 1000
//   var table = options.tokensTable || TokenTable({size: options.maxKeys})
//   var message = options.message || "You have exceeded your request rate of " + rate + " r/" + window + "ms."

//   var getter = table.get
//   var putter = table.put
//   if (table.put.length == 2 && table.get.length == 1) {
//     // This looks like a synchronous table, wrap the methods to make them async.
//     getter = function (key, cb) {
//       process.nextTick(function () {
//         cb(null, table.get(key))
//       })
//     }
//     putter = function (key, bucket, cb) {
//       process.nextTick(function () {
//         cb(null, table.put(key, bucket))
//       })
//     }
//   }
//   else if (table.put.length != 3 && table.get.length != 2) {
//     throw new Error("Unable to detect TokenTable implementation type (sync/async) check API.")
//   }

//   function rateLimit(req, res, next) {
//     var attr = key(req) || return next()

//     // Check the overrides
//     if (options.overrides &&
//       options.overrides[attr] &&
//       options.overrides[attr].burst !== undefined &&
//       options.overrides[attr].rate !== undefined) {

//       burst = options.overrides[attr].burst
//       rate = options.overrides[attr].rate
//     }

//     if (!rate || !burst) return next()

//     var reqInfo = {
//       throttle_key: attr,
//       address: req.connection.remoteAddress || "?",
//       method: req.method,
//       url: req.url,
//       user: req.username || "?"
//     }

//     function checkIfThrottled(err, bucket) {
//       if (err) {
//         reqInfo.err = err
//         req.log.warn(reqInfo, "Error checking async throttle")
//         return next()
//       }
//       if (bucket) {
//         // Recreate the token bucket
//         bucket = TokenBucket(bucket)
//       }
//       else {
//         // Make a new one
//         bucket = TokenBucket({
//           capacity: burst,
//           fillRate: rate,
//           window: window,
//         })
//       }

//       req.log.trace("Throttle(%s): num_tokens= %d", attr, bucket.tokens)

//       var hasCapacity = bucket.consume(1)
//       putter.call(table, attr, bucket, function (err) {
//         if (err) {
//           reqInfo.err = err
//           req.log.warn(reqInfo, "Error saving throttle information.")
//         }
//         if (!hasCapacity) {
//           req.log.info(reqInfo, "Throttling")
//           return next(new Error(message))
//         }

//         return next()
//       })
//     }

//     getter.call(table, attr, checkIfThrottled)
//   }

//   return rateLimit
// }

function Throttle(options) {
  if (!(this instanceof Throttle)) return new Throttle(options)
  assert.object(options, "options")
  assert.number(options.rate, "options.rate")

  this.burst = options.burst || options.rate
  this.rate = options.rate
  this.window = options.window || 1000
  this.table = table = options.tokensTable || TokenTable({size: options.maxKeys})
  this.overrides = options.overrides

  this.getter = table.get
  this.putter = table.put
  if (table.put.length == 2 && table.get.length == 1) {
    // This looks like a synchronous table, wrap the methods to make them async.
    this.getter = function (key, cb) {
      process.nextTick(function () {
        cb(null, table.get(key))
      })
    }
    this.putter = function (key, bucket, cb) {
      process.nextTick(function () {
        cb(null, table.put(key, bucket))
      })
    }
  }
  else if (table.put.length != 3 && table.get.length != 2) {
    throw new Error("Unable to detect TokenTable implementation type (sync/async) check API.")
  }
}

/**
 * Test a key for throttle status.
 * @param  {String}   key Throttle key to check.
 * @param  {Function} cb  Callback f(err, limited)
 */
Throttle.prototype.rateLimit = function (key, cb) {
  if (key === undefined || key === null) return cb()
  var self = this

  var burst = self.burst
  var rate = self.rate

  // Check the overrides
  if (self.overrides &&
    self.overrides[key] &&
    self.overrides[key].burst !== undefined &&
    self.overrides[key].rate !== undefined) {

    burst = self.overrides[key].burst
    rate = self.overrides[key].rate
  }

  if (!rate || !burst) return cb()

  self.getter.call(table, key, function (err, bucket) {
    if (err) {
      return cb(new Error("Unable to check token table" + err))
    }
    if (bucket) {
      // Recreate the token bucket
      bucket = TokenBucket(bucket)
    }
    else {
      // Make a new one
      bucket = TokenBucket({
        capacity: burst,
        fillRate: rate,
        window: self.window,
      })
    }


    var hasCapacity = bucket.consume(1)

    //console.log("Throttle(%s): num_tokens= %d -- throttled: %s", key, bucket.tokens, !hasCapacity)

    self.putter.call(table, key, bucket, function (err) {
      // Error here is not fatal -- we were able to determine throttle status, just not save state.
      if (err) {
        err = new Error("Error saving throttle information to table" + err)
      }
      if (!hasCapacity) {
        return cb(err, true)
      }
      return cb(err, false)
    })
  })
}