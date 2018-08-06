const knx = require('knx')
const dptlib = require('knx-dpt')

module.exports = function(RED) {
    function knxEasyConfigNode(n) {
        RED.nodes.createNode(this,n)
        var node = this
        node.host = n.host
        node.port = n.port

        //Config node state
        node.connected = false
        node.connecting = false
        
        // Define functions called by knxEasy in and out nodes
        node.inputUsers = {}
        node.outputUsers = {}
        
        node.register = function(userType, knxNode) {
            userType == "in"
                ? node.inputUsers[knxNode.id] = knxNode
                : node.outputUsers[knxNode.id] = knxNode
            if (Object.keys(node.inputUsers).length + Object.keys(node.outputUsers).length === 1) {
                node.connect();
            }
        }

        node.deregister = function(userType, knxNode) {
            userType == "in"
                ? delete node.inputUsers[knxNode.id]
                : delete node.outputUsers[knxNode.id]
                if (Object.keys(node.inputUsers).length + Object.keys(node.outputUsers).length === 0) {
                node.knxConnection = null
            }
        }

        node.connect = function () {
            if (!node.connected && !node.connecting) {
                node.connecting = true
                node.knxConnection = new knx.Connection({
                    ipAddr: node.host,
                    ipPort: node.port,
                    handlers: {
                        connected: function() {
                            node.connecting = false
                            node.connected = true
                            for (var id in node.inputUsers) {
                                if (node.inputUsers.hasOwnProperty(id)) {
                                    node.inputUsers[id].status({fill:"green",shape:"dot",text:"node-red:common.status.connected"})
                                }
                            }
                            for (var id in node.outputUsers) {
                                if (node.outputUsers.hasOwnProperty(id)) {
                                    node.outputUsers[id].status({fill:"green",shape:"dot",text:"node-red:common.status.connected"})
                                }
                            }
                        },
                        error: function(connstatus) {
                            node.error(connstatus)
                            node.connecting = false
                            node.connected = false
                            for (var id in node.inputUsers) {
                                if (node.inputUsers.hasOwnProperty(id)) {
                                    node.inputUsers[id].status({fill:"red",shape:"dot",text:"node-red:common.status.disconnected"})
                                }
                            }
                            for (var id in node.outputUsers) {
                                if (node.outputUsers.hasOwnProperty(id)) {
                                    node.outputUsers[id].status({fill:"red",shape:"dot",text:"node-red:common.status.disconnected"})
                                }
                            }
                            node.connect()
                        }
                    }
                })
                node.knxConnection.on("event", function (evt, src, dest, value) {
                    if (evt == "GroupValue_Write" || evt == "GroupValue_Response") {
                        for (var id in node.inputUsers) {
                            if (node.inputUsers.hasOwnProperty(id)) {
				                var input = node.inputUsers[id]
                                if (input.topic == dest) {
                                    var dpt = dptlib.resolve(input.dpt)
                                    var jsValue = dptlib.fromBuffer(value,dpt)
                                    var msg = 
                                        { topic:dest
                                        , payload:jsValue
                                        , knx: 
                                            { event: evt
                                            , dpt: input.dpt
                                            , dptDetails: dpt
                                            , source: src
                                            , destination: dest
                                            , rawValue: value
                                            }
                                        }
                                    input.send(msg)
                                }
                            }
                        }
                    }
                })
            }
        };
        
        node.on("close", function () {
            node.knxConnection.Disconnect()
            node.knxConnection = null
        })
    }
    RED.nodes.registerType("knxEasy-config",knxEasyConfigNode);
}
