const dptlib = require('knx-dpt')
module.exports = function (RED) {
    function knxEasyOut(config) {
        RED.nodes.createNode(this, config)
        var node = this
        node.server = RED.nodes.getNode(config.server)
        node.topic = config.topic
        node.dpt = config.dpt || "1.001"

        if (node.server) {
            if (node.topic) {
                node.server.register("out", node)
            }
        }

        node.on("input", function(msg) {
            if (node.server) {
                if (node.server.knxConnection) {
                    node.server.knxConnection.write(node.topic, msg.payload, node.dpt)
                }
            }
        })

        node.on('close', function() {
            if (node.server) {
                node.server.deregister("out", node);
            }
        })
    }
    RED.nodes.registerType("knxEasy-out", knxEasyOut)
}