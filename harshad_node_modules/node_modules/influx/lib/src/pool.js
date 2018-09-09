"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var exponential_1 = require("./backoff/exponential");
var host_1 = require("./host");
var http = require("http");
var https = require("https");
var querystring = require("querystring");
/**
 * Status codes that will cause a host to be marked as 'failed' if we get
 * them from a request to Influx.
 * @type {Array}
 */
var resubmitErrorCodes = [
    'ETIMEDOUT',
    'ESOCKETTIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EHOSTUNREACH',
];
/**
 * An ServiceNotAvailableError is returned as an error from requests that
 * result in a > 500 error code.
 */
var ServiceNotAvailableError = (function (_super) {
    __extends(ServiceNotAvailableError, _super);
    function ServiceNotAvailableError(message) {
        var _this = _super.call(this) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, ServiceNotAvailableError.prototype);
        return _this;
    }
    return ServiceNotAvailableError;
}(Error));
exports.ServiceNotAvailableError = ServiceNotAvailableError;
/**
 * An RequestError is returned as an error from requests that
 * result in a 300 <= error code <= 500.
 */
var RequestError = (function (_super) {
    __extends(RequestError, _super);
    function RequestError(req, res, body) {
        var _this = _super.call(this) || this;
        _this.req = req;
        _this.res = res;
        _this.message = "A " + res.statusCode + " " + res.statusMessage + " error occurred: " + body;
        Object.setPrototypeOf(_this, RequestError.prototype);
        return _this;
    }
    RequestError.Create = function (req, res, callback) {
        var body = '';
        res.on('data', function (str) { return body = body + str.toString(); });
        res.on('end', function () { return callback(new RequestError(req, res, body)); });
    };
    return RequestError;
}(Error));
exports.RequestError = RequestError;
/**
 * Creates a function generation that returns a wrapper which only allows
 * through the first call of any function that it generated.
 */
function doOnce() {
    var handled = false;
    return function (fn) {
        return function (arg) {
            if (handled) {
                return;
            }
            handled = true;
            fn(arg);
        };
    };
}
function setToArray(itemSet) {
    var output = [];
    itemSet.forEach(function (value) {
        output.push(value);
    });
    return output;
}
var request = function (options, callback) {
    if (options.protocol === 'https:') {
        return https.request(options, callback);
    }
    else {
        return http.request(options, callback);
    }
};
/**
 *
 * The Pool maintains a list available Influx hosts and dispatches requests
 * to them. If there are errors connecting to hosts, it will disable that
 * host for a period of time.
 */
var Pool = (function () {
    /**
     * Creates a new Pool instance.
     * @param {IPoolOptions} options
     */
    function Pool(options) {
        this.options = Object.assign({
            backoff: new exponential_1.ExponentialBackoff({
                initial: 300,
                max: 10 * 1000,
                random: 1,
            }),
            maxRetries: 2,
            requestTimeout: 30 * 1000,
        }, options);
        this.index = 0;
        this.hostsAvailable = new Set();
        this.hostsDisabled = new Set();
        this.timeout = this.options.requestTimeout;
    }
    /**
     * Returns a list of currently active hosts.
     * @return {Host[]}
     */
    Pool.prototype.getHostsAvailable = function () {
        return setToArray(this.hostsAvailable);
    };
    /**
     * Returns a list of hosts that are currently disabled due to network
     * errors.
     * @return {Host[]}
     */
    Pool.prototype.getHostsDisabled = function () {
        return setToArray(this.hostsDisabled);
    };
    /**
     * Inserts a new host to the pool.
     */
    Pool.prototype.addHost = function (url, options) {
        if (options === void 0) { options = {}; }
        var host = new host_1.Host(url, this.options.backoff.reset(), options);
        this.hostsAvailable.add(host);
        return host;
    };
    /**
     * Returns true if there's any host available to by queried.
     * @return {Boolean}
     */
    Pool.prototype.hostIsAvailable = function () {
        return this.hostsAvailable.size > 0;
    };
    /**
     * Makes a request and calls back with the response, parsed as JSON.
     * An error is returned on a non-2xx status code or on a parsing exception.
     */
    Pool.prototype.json = function (options) {
        return this.text(options).then(function (res) { return JSON.parse(res); });
    };
    /**
     * Makes a request and resolves with the plain text response,
     * if possible. An error is raised on a non-2xx status code.
     */
    Pool.prototype.text = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.stream(options, function (err, res) {
                if (err) {
                    return reject(err);
                }
                var output = '';
                res.on('data', function (str) { return output = output + str.toString(); });
                res.on('end', function () { return resolve(output); });
            });
        });
    };
    /**
     * Makes a request and discards any response body it receives.
     * An error is returned on a non-2xx status code.
     */
    Pool.prototype.discard = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.stream(options, function (err, res) {
                if (err) {
                    return reject(err);
                }
                res.on('data', function () { });
                res.on('end', function () { return resolve(); });
            });
        });
    };
    /**
     * Ping sends out a request to all available Influx servers, reporting on
     * their response time and version number.
     */
    Pool.prototype.ping = function (timeout, path) {
        if (path === void 0) { path = '/ping'; }
        var todo = [];
        setToArray(this.hostsAvailable)
            .concat(setToArray(this.hostsDisabled))
            .forEach(function (host) {
            var start = Date.now();
            var url = host.url;
            var once = doOnce();
            return todo.push(new Promise(function (resolve) {
                var req = request(Object.assign({
                    hostname: url.hostname,
                    method: 'GET',
                    path: path,
                    port: Number(url.port),
                    protocol: url.protocol,
                    timeout: timeout,
                }, host.options), once(function (res) {
                    resolve({
                        url: url,
                        res: res,
                        online: res.statusCode < 300,
                        rtt: Date.now() - start,
                        version: res.headers['x-influxdb-version'],
                    });
                }));
                var fail = once(function () {
                    resolve({
                        online: false,
                        res: null,
                        rtt: Infinity,
                        url: url,
                        version: null,
                    });
                });
                // Support older Nodes and polyfills which don't allow .timeout() in
                // the request options, wrapped in a conditional for even worse
                // polyfills. See: https://github.com/node-influx/node-influx/issues/221
                if (typeof req.setTimeout === 'function') {
                    req.setTimeout(timeout, fail); // tslint:disable-line
                }
                req.on('timeout', fail);
                req.on('error', fail);
                req.end();
            }));
        });
        return Promise.all(todo);
    };
    /**
     * Makes a request and calls back with the IncomingMessage stream,
     * if possible. An error is returned on a non-2xx status code.
     */
    Pool.prototype.stream = function (options, callback) {
        var _this = this;
        if (!this.hostIsAvailable()) {
            return callback(new ServiceNotAvailableError('No host available'), null);
        }
        var path = options.path;
        if (options.query) {
            path += '?' + querystring.stringify(options.query);
        }
        var once = doOnce();
        var host = this.getHost();
        var req = request(Object.assign({
            headers: { 'content-length': options.body ? new Buffer(options.body).length : 0 },
            hostname: host.url.hostname,
            method: options.method,
            path: path,
            port: Number(host.url.port),
            protocol: host.url.protocol,
            timeout: this.timeout,
        }, host.options), once(function (res) {
            if (res.statusCode >= 500) {
                return _this.handleRequestError(new ServiceNotAvailableError(res.statusMessage), host, options, callback);
            }
            if (res.statusCode >= 300) {
                return RequestError.Create(req, res, function (err) { return callback(err, res); });
            }
            host.success();
            return callback(undefined, res);
        }));
        // Handle network or HTTP parsing errors:
        req.on('error', once(function (err) {
            _this.handleRequestError(err, host, options, callback);
        }));
        // Handle timeouts:
        req.on('timeout', once(function () {
            _this.handleRequestError(new ServiceNotAvailableError('Request timed out'), host, options, callback);
        }));
        // Support older Nodes and polyfills which don't allow .timeout() in the
        // request options, wrapped in a conditional for even worse polyfills. See:
        // https://github.com/node-influx/node-influx/issues/221
        if (typeof req.setTimeout === 'function') {
            req.setTimeout(this.timeout); // tslint:disable-line
        }
        // Write out the body:
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    };
    /**
     * Returns the next available host for querying.
     * @return {Host}
     */
    Pool.prototype.getHost = function () {
        var available = setToArray(this.hostsAvailable);
        var host = available[this.index];
        this.index = (this.index + 1) % available.length;
        return host;
    };
    /**
     * Re-enables the provided host, returning it to the pool to query.
     * @param  {Host} host
     */
    Pool.prototype.enableHost = function (host) {
        this.hostsDisabled.delete(host);
        this.hostsAvailable.add(host);
    };
    /**
     * Disables the provided host, removing it from the query pool. It will be
     * re-enabled after a backoff interval
     */
    Pool.prototype.disableHost = function (host) {
        var _this = this;
        this.hostsAvailable.delete(host);
        this.hostsDisabled.add(host);
        this.index %= Math.max(1, this.hostsAvailable.size);
        setTimeout(function () { return _this.enableHost(host); }, host.fail());
    };
    Pool.prototype.handleRequestError = function (err, host, options, callback) {
        if (!(err instanceof ServiceNotAvailableError) &&
            resubmitErrorCodes.indexOf(err.code) === -1) {
            return callback(err, null);
        }
        this.disableHost(host);
        var retries = options.retries || 0;
        if (retries < this.options.maxRetries && this.hostIsAvailable()) {
            options.retries = retries + 1;
            return this.stream(options, callback);
        }
        callback(err, null);
    };
    return Pool;
}());
exports.Pool = Pool;
