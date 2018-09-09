"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var urlModule = require("url");
var Host = (function () {
    /**
     * Creates a new Host instance.
     * @param {String} url
     * @param {IBackoffStrategy} backoff
     */
    function Host(url, backoff, options) {
        this.backoff = backoff;
        this.options = options;
        this.url = urlModule.parse(url);
    }
    /**
     * Marks a failure on the host and returns the length of time it
     * should be removed from the pool
     * @return {Number} removal time in milliseconds
     */
    Host.prototype.fail = function () {
        var value = this.backoff.getDelay();
        this.backoff = this.backoff.next();
        return value;
    };
    /**
     * Should be called when a successful operation is run against the host.
     * It resets the host's backoff strategy.
     */
    Host.prototype.success = function () {
        this.backoff = this.backoff.reset();
    };
    return Host;
}());
exports.Host = Host;
