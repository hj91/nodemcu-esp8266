"use strict";
/**
 * @module node-opcua-client
 */
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-empty
const chalk_1 = require("chalk");
const events_1 = require("events");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_constants_1 = require("node-opcua-constants");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const serverStatusStateNodeId = node_opcua_nodeid_1.coerceNodeId(node_opcua_constants_1.VariableIds.Server_ServerStatus_State);
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const warningLog = debugLog;
const emptyCallback = (err) => {
};
class ClientSessionKeepAliveManager extends events_1.EventEmitter {
    constructor(session) {
        super();
        this.session = session;
        this.timerId = undefined;
        this.pingTimeout = 0;
        this.checkInterval = 0;
    }
    start() {
        node_opcua_assert_1.assert(!this.timerId);
        node_opcua_assert_1.assert(this.session.timeout > 100);
        this.pingTimeout = this.session.timeout * 2 / 3;
        this.checkInterval = this.pingTimeout / 3;
        this.timerId = setInterval(() => this.ping_server(), this.checkInterval);
    }
    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = undefined;
        }
    }
    /**
     * @method ping_server
     * @internal
     * when a session is opened on a server, the client shall send request on a regular basis otherwise the server
     * session object might time out.
     * start_ping make sure that ping_server is called on a regular basis to prevent session to timeout.
     *
     * @param callback
     */
    ping_server(callback) {
        if (callback === undefined) {
            callback = emptyCallback;
        }
        const session = this.session;
        if (!session) {
            return callback();
        }
        const now = Date.now();
        const timeSinceLastServerContact = now - session.lastResponseReceivedTime.getTime();
        if (timeSinceLastServerContact < this.pingTimeout) {
            // no need to send a ping yet
            // console.log("Skipping ",timeSinceLastServerContact,this.session.timeout);
            return callback();
        }
        if (session.isReconnecting) {
            debugLog("ClientSessionKeepAliveManager#ping_server skipped because client is reconnecting");
            return callback();
        }
        debugLog("ClientSessionKeepAliveManager#ping_server ", timeSinceLastServerContact, this.session.timeout);
        // Server_ServerStatus_State
        session.readVariableValue(serverStatusStateNodeId, (err, dataValue) => {
            if (err || !dataValue || !dataValue.value) {
                if (err) {
                    warningLog(chalk_1.default.cyan(" warning : ClientSessionKeepAliveManager#ping_server "), chalk_1.default.yellow(err.message));
                }
                this.stop();
                /**
                 * @event failure
                 * raised when the server is not responding or is responding with en error to
                 * the keep alive read Variable value transaction
                 */
                this.emit("failure");
                if (callback) {
                    callback();
                }
                return;
            }
            if (dataValue.statusCode === node_opcua_status_code_1.StatusCodes.Good) {
                const newState = dataValue.value.value;
                // istanbul ignore next
                if (newState !== this.lastKnownState) {
                    warningLog(" Server State = ", newState.toString());
                }
                this.lastKnownState = newState;
            }
            this.emit("keepalive", this.lastKnownState);
            if (callback) {
                callback();
            }
        });
    }
}
exports.ClientSessionKeepAliveManager = ClientSessionKeepAliveManager;
//# sourceMappingURL=client_session_keepalive_manager.js.map