"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @class
 * @implements {IBackoffStrategy}
 */
var ExponentialBackoff = (function () {
    /**
     * Creates a new exponential backoff strategy.
     * @see https://en.wikipedia.org/wiki/Exponential_backoff
     * @param {IExponentialOptions} options
     */
    function ExponentialBackoff(options) {
        this.options = options;
        this.counter = 0;
    }
    /**
     * @inheritDoc
     */
    ExponentialBackoff.prototype.getDelay = function () {
        var count = this.counter - Math.round(Math.random() * this.options.random); // tslint:disable-line
        return Math.min(this.options.max, this.options.initial * Math.pow(2, Math.max(count, 0)));
    };
    /**
     * @inheritDoc
     */
    ExponentialBackoff.prototype.next = function () {
        var next = new ExponentialBackoff(this.options);
        next.counter = this.counter + 1;
        return next;
    };
    /**
     * @inheritDoc
     */
    ExponentialBackoff.prototype.reset = function () {
        return new ExponentialBackoff(this.options);
    };
    return ExponentialBackoff;
}());
exports.ExponentialBackoff = ExponentialBackoff;
