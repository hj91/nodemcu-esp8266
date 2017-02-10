
// Washing Machine Status 
//(c) harshad joshi
// Libraries used - PubSubClient https://github.com/knolleary/pubsubclient
//                
// Hardware user  - ESP8266 NodeMCU
//                - Raspberry Pi running on Jessie Pixel, MQTT broker mosquitto
//                - SW 420 vibration sensor 

#include <ESP8266WiFi.h>
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient client(espClient);


char msg[50];
char msg2[50];


const char* ssid = "Derp";
const char* password = "";
const char* mqtt_server = "192.168.1.4"; //raspberry pi 

#define SECOND 1000
#define QUARTER_SECOND 250

#define SENSOR_PIN D1

bool machineRunning = false;

bool lastState = false;
int lastTripped = 0;

int tripBucket = 0;
int tripBucketLastDripped = 0;

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
  pinMode(SENSOR_PIN, INPUT);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
}


void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();
    
  char message[58];
  char message2[50];
  
  int now = millis();
  int sinceLastTripped = now - lastTripped;
  int sinceLastDrip = now - tripBucketLastDripped;

  if (tripBucket > 0 && sinceLastDrip > SECOND) {
    tripBucket--;
    tripBucketLastDripped = now;
    Serial.print("Drip! ");
    Serial.println(tripBucket);
  }

  // Read the state and see if the sensor was tripped
  bool state = digitalRead(SENSOR_PIN) == 0 ? false : true;
  if (lastState != state) {
    lastState = state;

    // Can be tripped a maximum of once per second
    if (sinceLastTripped > QUARTER_SECOND) {
      lastTripped = now;

      if (tripBucket < 300) {
        tripBucket++;
      }
    }
  }


  if (machineRunning && tripBucket == 0) {
    machineRunning = false;
    Serial.println("Machine stopped");
    String msg = "";
    msg = "Machine stopped";
    msg.toCharArray(message,58);
 
    client.publish("esp8266/machineOn", message);
    //sendDoneNotification();
  }

  if (!machineRunning && tripBucket > 60) {
    machineRunning = true;
    Serial.println("Machine started");
    String msg2 = "";
    msg2 = "Machine started";
    msg2.toCharArray(message2,58);

    
    client.publish("esp8266/machineOn",message2);

  }

  delay(5);
}


void sendDoneNotification() {
  {
    //delay(100);
  }

  
 // WiFi.disconnect();
}
