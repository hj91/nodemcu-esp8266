"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_service_discovery_1 = require("node-opcua-service-discovery");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename) || true;
class MDNSResponder {
    constructor() {
        this.lastUpdateDate = new Date();
        this.registeredServers = [];
        this.multicastDNS = node_opcua_service_discovery_1.acquireBonjour();
        this.recordId = 0;
        this.responder = this.multicastDNS.find({
            protocol: "tcp",
            type: "opcua-tcp"
        });
        const findServiceIndex = (serverName) => {
            const index = this.registeredServers.findIndex((server) => server.serverName === serverName);
            return index;
        };
        const addService = (service) => {
            if (doDebug) {
                debugLog("adding server ", service.name, "port =", service.port);
            }
            // example:
            // {
            //     addresses: [ '172.18.207.145', 'fe80::d4e3:352c:9f8b:d0db' ],
            //     rawTxt: <Buffer 05 70 61 74 68 3d 08 63 61 70 73 3d 4c 44 53>,
            //     txt: { path: '', caps: 'LDS' },
            //     name: 'UA Local Discovery Server on STERFIVEPC2',
            //     fqdn: 'UA Local Discovery Server on STERFIVEPC2._opcua-tcp._tcp.local',
            //     host: 'STERFIVEPC2.local',
            //     referer:
            //     {
            //        address: '172.18.207.145',
            //        family: 'IPv4',
            //        port: 5353,
            //        size: 363
            //     },
            //     port: 4840,
            //     type: 'opcua-tcp',
            //     protocol: 'tcp',
            //  subtypes: []
            // },
            const existingIndex = findServiceIndex(service.name);
            if (existingIndex >= 0) {
                debugLog("Ignoring existing server ", service.name);
                return;
            }
            this.recordId++;
            const recordId = this.recordId;
            const serverName = service.name;
            service.txt = service.txt || {};
            const service_txt = service.txt;
            service_txt.caps = service_txt.caps || "";
            const serverCapabilities = service_txt.caps.split(",").map((x) => x.toUpperCase()).sort();
            const path = service_txt.path || "";
            const discoveryUrl = "opc.tcp://" + service.host + ":" + service.port + path;
            this.registeredServers.push(new node_opcua_service_discovery_1.ServerOnNetwork({
                discoveryUrl,
                recordId,
                serverCapabilities,
                serverName
            }));
            this.lastUpdateDate = new Date(Date.now());
            debugLog("a new OPCUA server has been registered on mDNS", service.name, recordId);
        };
        const removeService = (service) => {
            const serverName = service.name;
            debugLog("a OPCUA server has been unregistered in mDNS", serverName);
            const index = findServiceIndex(serverName);
            if (index === -1) {
                debugLog("Cannot find server with name ", serverName, " in registeredServers");
                return;
            }
            this.registeredServers.splice(index, 1); // remove element at index
            this.lastUpdateDate = new Date();
        };
        this.responder.on("up", (service) => {
            if (doDebug) {
                debugLog("service is up with  ", service.fqdn);
            }
            addService(service);
        });
        this.responder.on("down", (service) => {
            if (doDebug) {
                debugLog("service is down with  ", service.fqdn);
            }
            removeService(service);
        });
    }
    dispose() {
        delete this.multicastDNS;
        node_opcua_service_discovery_1.releaseBonjour();
    }
}
exports.MDNSResponder = MDNSResponder;
//# sourceMappingURL=mdns_responder.js.map