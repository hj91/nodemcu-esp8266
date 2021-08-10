# ClockTickr :alarm_clock:

A very simple ticker that emits `tick` events at a clock-sychronised, self-adjusting interval.

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

## Features

* It ticks at the specified interval.
* It keeps itself synchronised with the system clock.
* .. more ticks.

## Installation

```
npm install --save clock-tickr
```

## Usage:

Create a ClockTickr instance, with an optional tick interval in ms (default is `1000`) and start it. See below.

```javascript
const ClockTickr = require('clock-tickr')

let tickr = new ClockTickr({ interval: 250 })

tickr.on('tick', (tick) => {
  console.log(tick)
  
})

tickr.start()
```
results in (when you change the system time while running)

```
...
{ actual: 1539887917504, expected: 1539887917500, drift: 4 }
{ actual: 1539887917753, expected: 1539887917750, drift: 3 }
{ actual: 1539886920168, expected: 1539887918000, drift: -997832 }
Did you travel in time?
{ actual: 1539886920501, expected: 1539886920500, drift: 1 }
{ actual: 1539886920751, expected: 1539886920750, drift: 1 }
...
```


## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## Credits

* Jeroen Coussement - [@coussej](https://twitter.com/coussej) - [coussej.github.io](http://coussej.github.io)

## License

MIT
