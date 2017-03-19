// This is modified code of https://github.com/hj91/nodemcu-esp8266/tree/master/mqtt_relay_on_off
// No hardcoding of wifi network required.
// Hardware used - 4 channel relay board 
//                 NodeMCU 
//
// (c) Harshad Joshi, March 2017

#include <ESP8266WiFi.h>          

//needed for library
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>         
#include <PubSubClient.h>


WiFiClient espClient;
PubSubClient client(espClient);

const char* mqtt_server = "m13.cloudmqtt.com";

long lastMsg = 0;
char msg[50];
int value = 0;


void setup() {
   
    Serial.begin(115200);

    WiFiManager wifiManager;
        
    wifiManager.autoConnect("AutoConnectAP");
     
    Serial.println("connected...woot :)");

  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(D1, OUTPUT);     // Initialize the D1 pin as an output
  digitalWrite(D1, HIGH);
  Serial.begin(115200);
  
  client.setServer(mqtt_server, 13968);
  client.setCallback(callback);
  
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

   
  // Switch on the LED if an 1 was received as first character
  if ((char)payload[0] == '1') {
    digitalWrite(D1, LOW);   // Turn the LED on (Note that LOW is the voltage level
    // but actually the LED is on; this is because
    // it is acive low on the ESP-01)
    digitalWrite(LED_BUILTIN, LOW);
  } else {
    digitalWrite(D1, HIGH);  // Turn the LED off by making the voltage HIGH
    digitalWrite(LED_BUILTIN, HIGH);
  }

}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "ESP8266Client-";
    //clientId += String(random(0xffff), HEX);
    // Attempt to connect
    if (client.connect(clientId.c_str(),"","")) {
      Serial.println("connected");
      // Once connected, publish an announcement...
      client.subscribe("harshad/harshad");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}



void loop() {
   if (!client.connected()) {
    reconnect();
  }
  client.loop();

  long now = millis();
  if (now - lastMsg > 2000) {
    lastMsg = now;
    ++value;
   // snprintf (msg, 75, "namaste #%ld", value);
    Serial.print("Publish message: ");
    Serial.println(msg);
  
  }
    
}
