const EventEmitter = require('events')

class ClockTickr extends EventEmitter {
  constructor (options) {
    super()
    if (!options) options = {}
    this._interval = options.interval || 1000
    this._enabled = false
  }

  start () {
    if (this._enabled) return
    this._enabled = true
    this._tick()
  }

  stop () {
    this._enabled = false
  }

  _tick (expected) {
    if (!this._enabled) return

    let actual = Date.now()
    let drift = actual - expected

    if (expected) this.emit('tick', { actual, expected, drift })

    let next = (this._interval - (drift || actual) % this._interval)

    setTimeout(() => { this._tick(actual + next) }, next)
  }
}

module.exports = ClockTickr
