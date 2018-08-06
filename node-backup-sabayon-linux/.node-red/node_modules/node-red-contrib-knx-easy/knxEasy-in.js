module.exports = function (RED) {
    function knxEasyIn(config) {
        RED.nodes.createNode(this, config)
        var node = this
        node.server = RED.nodes.getNode(config.server)
        node.topic = config.topic
        node.dpt = config.dpt || "1.001"

        if (node.server) {
            if (node.topic) {
                node.server.register("in", node)
            }
        }
        node.on('close', function() {
                if (node.server) {
                    node.server.deregister("in", node);
                }
        });
    }
    RED.nodes.registerType("knxEasy-in", knxEasyIn)
}