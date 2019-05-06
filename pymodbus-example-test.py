#example for python modbus library
from pymodbus.client.sync import ModbusTcpClient

client = ModbusTcpClient('192.168.1.4')
d = client.write_register(40015,1,unit = 1)
print d
print "Modbus function code",d.function_code
p = client.write_register(40015,0,unit = 1)
print p
print "Modbus function code", p.function_code
c = client.read_holding_registers(40015,unit = 1)
print c
print c.function_code
client.close()


