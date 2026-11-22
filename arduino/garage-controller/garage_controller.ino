#include <Servo.h>

// Hardware
const int pirPin = 2;
const int servoPin = 9;

Servo gate;

// Gate position
int currentAngle = 0;
int targetAngle = 0;

// Gate states
enum GateState {
  CLOSED,
  OPENING,
  OPEN,
  CLOSING,
  STOPPED
};

GateState gateState = CLOSED;

// Timing
unsigned long previousMillis = 0;
const unsigned long interval = 15;

// PIR
int lastMotionState = LOW;

// Serial command
String command = "";

void setup() {
  pinMode(pirPin, INPUT);

  gate.attach(servoPin);
  gate.write(0);

  Serial.begin(9600);

  Serial.println("GARAGE SYSTEM READY");
  Serial.println("GATE_CLOSED");
}

void loop() {

  // 1. Detect motion
  int motion = digitalRead(pirPin);

  if (motion == HIGH && lastMotionState == LOW) {
    Serial.println("MOTION_DETECTED");
  }

  lastMotionState = motion;


  // 2. Receive commands
  while (Serial.available() > 0) {

    char c = Serial.read();

    if (c == '\n') {

      command.trim();

      if (command == "OPEN") {

        targetAngle = 90;

        if (currentAngle == targetAngle) {
          setGateState(OPEN);
        } else {
          setGateState(OPENING);
        }

      }

      else if (command == "CLOSE") {

        targetAngle = 0;

        if (currentAngle == targetAngle) {
          setGateState(CLOSED);
        } else {
          setGateState(CLOSING);
        }

      }

      else if (command == "STOP") {

        targetAngle = currentAngle;
        setGateState(STOPPED);

      }

      else if (command.length() > 0) {
        Serial.println("UNKNOWN_COMMAND");
      }

      command = "";
    }

    else {
      command += c;
    }
  }


  // 3. Move the servo gradually
  if (millis() - previousMillis >= interval) {

    previousMillis = millis();

    if (currentAngle < targetAngle) {

      currentAngle++;
      gate.write(currentAngle);

    }

    else if (currentAngle > targetAngle) {

      currentAngle--;
      gate.write(currentAngle);

    }


    // 4. Check whether movement is completed
    if (currentAngle == targetAngle) {

      if (gateState == OPENING) {
        setGateState(OPEN);
      }

      else if (gateState == CLOSING) {
        setGateState(CLOSED);
      }
    }
  }
}


// Function to update and report gate state
void setGateState(GateState newState) {

  if (gateState == newState) {
    return;
  }

  gateState = newState;

  switch (gateState) {

    case CLOSED:
      Serial.println("GATE_CLOSED");
      break;

    case OPENING:
      Serial.println("GATE_OPENING");
      break;

    case OPEN:
      Serial.println("GATE_OPEN");
      break;

    case CLOSING:
      Serial.println("GATE_CLOSING");
      break;

    case STOPPED:
      Serial.println("GATE_STOPPED");
      break;
  }
}