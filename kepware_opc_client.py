import sys
sys.path.insert(0, "..")
import logging

from opcua import Client


class SubHandler(object):

    """
    Client to subscription. It will receive events from server
    """

    def datachange_notification(self, node, val, data):
      # print("Python: New data change event", node, val)
      # print(node,val)
       pass

    def event_notification(self, event):
       #print("Python: New event", event)
       pass

if __name__ == "__main__":
    #from IPython import embed
    logging.basicConfig(level=logging.WARN)
    client = Client("opc.tcp://192.168.1.10:49320/KEPServerEX")
    #client = Client("opc.tcp://192.168.56.100:4840/OPCUA/SimulationServer/")
    #client = Client("opc.tcp://olivier:olivierpass@localhost:53530/OPCUA/SimulationServer/")
    try:
        client.connect()
        root = client.get_root_node()
        print("Root is", root)
        print("childs of root are: ", root.get_children())
        print("name of root is", root.get_browse_name())
        objects = client.get_objects_node()
        print("childs of objects are: ", objects.get_children())

        while True:
            tag1 = client.get_node("ns=2;s=Painting.Oven.Temperature;datatype=Float")
            print("tag1 is: {0} with value {1} ".format(tag1, tag1.get_value()))
            tag2 = client.get_node("ns=2;s=Painting.Oven.Fan;datatype=Float")
            print("tag2 is: {0} with value {1} ".format(tag2, tag2.get_value()))

        handler = SubHandler()
        sub = client.create_subscription(500, handler)
        handle1 = sub.subscribe_data_change(tag1)
        handle2 = sub.subscribe_data_change(tag2)

       # from IPython import embed
       # embed()

        sub.unsubscribe(handle1)
        sub.unsubscribe(handle2)
        sub.delete()
    finally:
        client.disconnect()
