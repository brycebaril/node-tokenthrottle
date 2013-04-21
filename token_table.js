module.exports = TokenTable

var LRU = require('lru-cache')

// Just a wrapper over LRU that supports put/get to store token -> bucket
// mappings
// This TokenTable is synchronous and only suitable for a single unclustered process.

function TokenTable(options) {
  if (!(this instanceof TokenTable)) return new TokenTable(options)
  this.table = new LRU(options.size || 10000)
}
TokenTable.prototype.put = function put(key, value) {
  this.table.set(key, value)
}
TokenTable.prototype.get = function get(key) {
  return this.table.get(key)
}