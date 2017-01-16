//(c) harshad joshi
// Libraries used - PubSubClient https://github.com/knolleary/pubsubclient
//                - dht http://osoyoo.com/wp-content/uploads/samplecode/DHT.zip
// Hardware user  - ESP8266 NodeMCU
//                - Raspberry Pi running on Jessie Pixel, MQTT broker mosquitto

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <dht.h>
dht DHT;

// Define NodeMCU D1 pin to as temperature data pin of  DHT11
#define DHT11_PIN D1

// Update these with values suitable for your network.
const char* ssid = "Derp";
const char* password = ""; // enter wifi password
const char* mqtt_server = "192.168.1.2"; // raspberrypi running mqtt broker
//const char* mqtt_server = "iot.eclipse.org";

WiFiClient espClient;
PubSubClient client(espClient);
long lastMsg = 0;
char msg[50];
int value = 0;

void setup_wifi() {
   delay(100);
  // We start by connecting to a WiFi network
    Serial.print("Connecting to ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) 
    {
      delay(500);
      Serial.print(".");
    }
  randomSeed(micros());
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) 
{
 // Not used here.. 
 // Serial.print("Command is : [");
 // Serial.print(topic);
 // int p =(char)payload[0]-'0';
 //  int chk = DHT.read11(DHT11_PIN);
 // if MQTT comes a 0 message, show humidity
 // if(p==0) 
 // {
 //   Serial.println("to show humidity!]");
 //   Serial.print(" Humidity is: " );
 //   Serial.print(DHT.humidity, 1);
 //   Serial.println('%');
 // }   // if MQTT comes a 1 message, show temperature
 // if(p==1)
 // {
 // digitalWrite(BUILTIN_LED, HIGH);
 //  Serial.println(" is to show temperature!] ");
  //int chk = DHT.read11(DHT11_PIN);
  // Serial.print(" Temp is: " );
  // Serial.print(DHT.temperature, 1);
  // Serial.println(' C');
 // }
 // Serial.println();
} //end callback

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) 
  {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    // Attempt to connect
    //if you MQTT broker has clientID,username and password
    //please change following line to    if (client.connect(clientId,userName,passWord))
    
    if (client.connect(clientId.c_str(),"harshad","harshad"))
    {
      Serial.println("connected");
     //once connected to MQTT broker, subscribe command if any
      client.subscribe("Command");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 6 seconds before retrying
      delay(6000);
    }
  }
} //end reconnect()

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  int chk = DHT.read11(DHT11_PIN);
  Serial.print(" Starting Humidity: " );
  Serial.print(DHT.humidity, 1);
  Serial.println('%');
  Serial.print(" Starting Temparature ");
  Serial.print(DHT.temperature, 1);
  Serial.println('C');
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  long now = millis();
  // read DHT11 sensor every 6 seconds
  if (now - lastMsg > 6000) {
     lastMsg = now;
     int chk = DHT.read11(DHT11_PIN);

    char message[58];
    char message2[50];
    
    String  msg= "" ;
    msg = msg + DHT.temperature;
    msg.toCharArray(message,58);
    
    String msg2 = "";
    msg2 = msg2 + DHT.humidity;
    msg2.toCharArray(message2,58);

        
     Serial.println(message);
     Serial.println(message2);
     
     //publish sensor data to MQTT broker
    client.publish("esp8266/temp", message);
    client.publish("esp8266/humidity",message2);
    
  }
}
