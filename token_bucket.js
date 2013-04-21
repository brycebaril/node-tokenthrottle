module.exports = TokenBucket

/**
 * An implementation of the Token Bucket algorithm.
 *
 * Basically, in network throttling, there are two "mainstream"
 * algorithms for throttling requests, Token Bucket and Leaky Bucket.
 * For restify, I went with Token Bucket.  For a good description of the
 * algorithm, see: http://en.wikipedia.org/wiki/Token_bucket
 *
 * In the options object, you pass in the total tokens and the fill rate.
 * Practically speaking, this means "allow `fill rate` requests/(throttle window),
 * with bursts up to `total tokens`".  Note that the bucket is initialized
 * to full.
 *
 * Also, in googling, I came across a concise python implementation, so this
 * is just a port of that. Thanks http://code.activestate.com/recipes/511490 !
 *
 * @param {Object} options contains the parameters:
 *                   - {Number} capacity the maximum burst.
 *                   - {Number} fillRate the rate to refill tokens.
 *                   - {Number} window   the time window to consider for throttling
 */
 function TokenBucket(options) {
  if (!(this instanceof TokenBucket)) return new TokenBucket(options)
  this.capacity = +options.capacity
  this.tokens = +options.tokens
  if (Number.isNaN(this.tokens)) {
    this.tokens = this.capacity
  }
  this.fillRate = +options.fillRate
  this.window = +options.window
  this.time = +options.time || Date.now()
}


/**
 * Consume N tokens from the bucket.
 *
 * If there is not capacity, the tokens are not pulled from the bucket.
 *
 * @param {Number} tokens the number of tokens to pull out.
 * @return {Boolean} true if capacity, false otherwise.
 */
 TokenBucket.prototype.consume = function consume(tokens) {
  if (tokens <= this._fill()) {
    this.tokens -= tokens
    return true
  }

  return false
}


/**
 * Fills the bucket with more tokens.
 *
 * Rather than do some whacky setTimeout() deal, we just approximate refilling
 * the bucket by tracking elapsed time from the last time we touched the bucket.
 *
 * Simply, we set the bucket size to min(totalTokens,
 *                                       current + (fillRate * elapsed time)).
 *
 * @return {Number} the current number of tokens in the bucket.
 */
 TokenBucket.prototype._fill = function _fill() {
  var now = Date.now()
  // reset account for clock drift (like DST)
  if (now < this.time) {
    this.time = now - this.window
  }

  if (this.tokens < this.capacity) {
    var delta = (this.fillRate / this.window) * (now - this.time)
    this.tokens = Math.min(this.capacity, this.tokens + delta)
  }

  this.time = now
  return this.tokens
}