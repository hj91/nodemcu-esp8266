// harshad joshi
// Now no need to add manual wifi ssid and password. 
// beta version

#include <PubSubClient.h>
#include <ESP8266WiFi.h>          //https://github.com/esp8266/Arduino
//needed for library
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>         //https://github.com/tzapu/WiFiManager

WiFiClient espClient;

PubSubClient client(espClient);

const char* mqtt_server = "m13.cloudmqtt.com";

long lastMsg = 0;
char msg[50];
int value = 0;

// get wemos emulator library from here https://github.com/hj91/esp8266-alexa-wemo-emulator

#include "WemoSwitch.h"
#include "WemoManager.h"
#include "CallbackFunction.h"

// prototypes
boolean connectWifi();

//on/off callbacks
void lightOn();
void lightOff();
void secondOn();
void secondOff();

//------- Replace the following! ------
//char ssid[] = "";       // your network SSID (name)
//char password[] = "";  // your network key

WemoManager wemoManager;
WemoSwitch *light = NULL;
WemoSwitch *second = NULL;

const int ledPin = D1;

void setup()
{
  Serial.begin(115200);

  // Set WiFi to station mode and disconnect from an AP if it was Previously
  // connected
 WiFiManager wifiManager;
    

   
    wifiManager.autoConnect("AutoConnectAP");
    Serial.println("connected...yeey :)");

    Serial.begin(115200);

  wemoManager.begin();
  // Format: Alexa invocation name, local port no, on callback, off callback
  light = new WemoSwitch("test lights", 80, lightOn, lightOff);
  second = new WemoSwitch("second lights", 81, secondOn, secondOff);
  wemoManager.addDevice(*light);
  wemoManager.addDevice(*second);

  pinMode(ledPin, OUTPUT); // initialize digital ledPin as an output.
  delay(10);
  digitalWrite(ledPin, HIGH); // Wemos BUILTIN_LED is active Low, so high is off
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
    if (client.connect(clientId.c_str(),"username","password")) {
      Serial.println("connected");
      // Once connected, publish an announcement...
  //    client.publish("harshad/harshad", "hello world");
      // ... and resubscribe
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


void loop()
{
  wemoManager.serverLoop();
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
  //  client.publish("harshad/harshad", msg);
  }
    
}

void lightOn() {
    Serial.print("Switch 1 turn on ...");
    digitalWrite(ledPin, LOW);
}

void lightOff() {
    Serial.print("Switch 1 turn off ...");
    digitalWrite(ledPin, HIGH);
}

void secondOn() {
    Serial.print("Switch 2 turn on ...");
    digitalWrite(ledPin, LOW);
}

void secondOff() {
    Serial.print("Switch 2 turn off ...");
    digitalWrite(ledPin, HIGH);
}
