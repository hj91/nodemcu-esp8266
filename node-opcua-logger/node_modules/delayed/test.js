const delayed = require('./')
const sinon = require('sinon')
const test = require('tape')
const expectedNullCtx = typeof window !== 'undefined' ? window : null

test('test delay() no-arg 100ms', (t) => {
  let spy = sinon.spy()

  delayed.delay(spy, 100)

  t.equal(spy.callCount, 0)

  setTimeout(() => t.equal(spy.callCount, 0), 50)
  setTimeout(() => t.equal(spy.callCount, 0), 75)
  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.equal(spy.firstCall.args.length, 0)
    t.same(spy.thisValues[0], expectedNullCtx)
    t.end()
  }, 110)
})

test('test delay() curried arguments', (t) => {
  let spy = sinon.spy()
  let ctx = {}

  delayed.delay(spy, 10, ctx, 'foo', 'bar')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args, [ 'foo', 'bar' ])
    t.same(spy.thisValues[0], ctx)
    t.end()
  }, 20)
})

test('test delay() cancelable', (t) => {
  let spy = sinon.spy()
  let timeout = delayed.delay(spy, 100)

  t.equal(spy.callCount, 0)
  clearTimeout(timeout)

  setTimeout(() => {
    t.equal(spy.callCount, 0)
    t.end()
  }, 20)
})

test('defer() no-arg', (t) => {
  let spy = sinon.spy()

  delayed.defer(spy)

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.equal(spy.firstCall.args.length, 0)
    t.same(spy.thisValues[0], expectedNullCtx)
    t.end()
  }, 5)
})

test('defer() curried arguments', (t) => {
  let spy = sinon.spy()
  let ctx = {}

  delayed.defer(spy, ctx, 'foo', 'bar')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args, [ 'foo', 'bar' ])
    t.same(spy.thisValues[0], ctx)
    t.end()
  }, 5)
})

test('defer() cancelable', (t) => {
  let spy = sinon.spy()
  let timeout = delayed.defer(spy)

  t.equal(spy.callCount, 0)
  clearTimeout(timeout)

  setTimeout(() => {
    t.equal(spy.callCount, 0)
    t.end()
  }, 5)
})

test('delayed() no-arg 100ms', (t) => {
  let spy = sinon.spy()

  delayed.delayed(spy, 100)()

  t.equal(spy.callCount, 0)

  setTimeout(() => { t.equal(spy.callCount, 0) }, 50)
  setTimeout(() => { t.equal(spy.callCount, 0) }, 75)
  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args.length, 0)
    t.same(spy.thisValues[0], expectedNullCtx)
    t.end()
  }, 110)
})

test('delayed() curried arguments', (t) => {
  let spy = sinon.spy()
  let ctx = {}

  delayed.delayed(spy, 10, ctx, 'foo', 'bar')('bang', 'boo')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args, [ 'foo', 'bar', 'bang', 'boo' ])
    t.same(spy.thisValues[0], ctx)
    t.end()
  }, 20)
})

test('delayed() multiple calls, curried', (t) => {
  let spy = sinon.spy()
  let ctx = {}
  let fn = delayed.delayed(spy, 10, ctx, 'spicy')

  fn('foo', 'bar')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args, [ 'spicy', 'foo', 'bar' ])
    t.same(spy.thisValues[0], ctx)
    fn('boom', 'bang')

    setTimeout(() => {
      t.equal(spy.callCount, 2)
      t.deepEqual(spy.secondCall.args, [ 'spicy', 'boom', 'bang' ])
      t.same(spy.thisValues[1], ctx)
      t.end()
    }, 20)
  }, 20)
})

test('deferred() no-arg', (t) => {
  let spy = sinon.spy()

  delayed.deferred(spy)()

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args.length, 0)
    t.same(spy.thisValues[0], expectedNullCtx)
    t.end()
  }, 5)
})

test('deferred() curried arguments', (t) => {
  let spy = sinon.spy()
  let ctx = {}

  delayed.deferred(spy, ctx, 'foo', 'bar')('bang', 'boo')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args, [ 'foo', 'bar', 'bang', 'boo' ])
    t.same(spy.thisValues[0], ctx)
    t.end()
  }, 5)
})

test('deferred() multiple calls, curried', (t) => {
  let spy = sinon.spy()
  let ctx = {}
  let fn = delayed.deferred(spy, ctx, 'spicy')

  fn('foo', 'bar')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args, [ 'spicy', 'foo', 'bar' ])
    t.same(spy.thisValues[0], ctx)
    fn('boom', 'bang')

    setTimeout(() => {
      t.equal(spy.callCount, 2)
      t.deepEqual(spy.secondCall.args, [ 'spicy', 'boom', 'bang' ])
      t.same(spy.thisValues[1], ctx)
      t.end()
    }, 5)
  }, 5)
})

test('debounce() same as cumulativeDelayed()', (t) => {
  t.same(delayed.cumulativeDelayed, delayed.debounce, 'same function')
  t.end()
})

test('cumulativeDelayed() no-arg 100ms', (t) => {
  let spy = sinon.spy()

  delayed.cumulativeDelayed(spy, 100)()

  t.equal(spy.callCount, 0)

  setTimeout(() => { t.equal(spy.callCount, 0) }, 50)
  setTimeout(() => { t.equal(spy.callCount, 0) }, 75)
  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args.length, 0)
    t.same(spy.thisValues[0], expectedNullCtx)
    t.end()
  }, 110)
})

test('cumulativeDelayed() curried arguments', (t) => {
  let spy = sinon.spy()
  let ctx = {}

  delayed.cumulativeDelayed(spy, 10, ctx, 'foo', 'bar')('bang', 'boo')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args, [ 'foo', 'bar', 'bang', 'boo' ])
    t.same(spy.thisValues[0], ctx)
    t.end()
  }, 20)
})

test('cumulativeDelayed() multiple calls within same tick, curried', (t) => {
  let spy = sinon.spy()
  let ctx = {}
  let fn = delayed.cumulativeDelayed(spy, 10, ctx, 'spicy')

  fn('foo1', 'bar1')
  fn('foo2', 'bar2')
  fn('foo3', 'bar3')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 1)
    t.deepEqual(spy.firstCall.args, [ 'spicy', 'foo3', 'bar3' ])
    t.same(spy.thisValues[0], ctx)
    t.end()
  }, 20)
})

test('cumulativeDelayed() multiple calls across ticks, curried', (t) => {
  let spy = sinon.spy()
  let ctx = {}
  let fn = delayed.cumulativeDelayed(spy, 50, ctx, 'spicy')

  fn('foo1', 'bar1')

  t.equal(spy.callCount, 0)

  setTimeout(() => {
    t.equal(spy.callCount, 0)
    fn('foo2', 'bar2')
    setTimeout(() => {
      t.equal(spy.callCount, 0)
      fn('foo3', 'bar3')
      setTimeout(() => {
        t.equal(spy.callCount, 0)
        fn('foo4', 'bar4')
        setTimeout(() => {
          t.equal(spy.callCount, 1)
          t.deepEqual(spy.firstCall.args, [ 'spicy', 'foo4', 'bar4' ])
          t.same(spy.thisValues[0], ctx)
          t.end()
        }, 100)
      }, 30)
    }, 30)
  }, 30)
})
