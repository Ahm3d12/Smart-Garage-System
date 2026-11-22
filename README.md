# Smart Garage --- Integration & Interface Specification

**Project:** Smart License Plate Recognition & Garage Access Control\
**Document type:** Team integration handoff\
**Version:** 1.0 --- 22 November 2026\
**Status:** Proposed integration contract; confirm open items with the
responsible team members before final hardware integration.

------------------------------------------------------------------------

## 1. Purpose

This document defines how the project components are expected to
communicate, what each team member must provide, the message formats,
integration sequence, and the checks required for the final
demonstration.

It is intended for all project members, especially:

-   **Person 1 --- Ultra96 / Vitis AI / Camera / OCR**
-   **Person 2 --- Raspberry Pi / Backend / Database / Authorization /
    REST API**
-   **Person 3 --- Arduino / Gate Control / Web Application**

The Raspberry Pi is the central integration point. The web application
must consume Person 2's API; it must not create a second backend or
database.

## 2. System architecture

``` text
                         CAMERA
                            |
                            v
                 +---------------------+
                 |       Ultra96       |
                 | Camera acquisition  |
                 | License plate OCR   |
                 +---------------------+
                            |
                     OCR result JSON
                            |
                            v
+----------------+   +----------------------+   +----------------------+
| PIR Sensor     |-->|     Raspberry Pi     |<--|   Web Application    |
| Arduino Uno    |   |                      |   | Browser dashboard    |
| Servo / Gate   |<->| Backend + Database   |<->| REST API client      |
+----------------+   | Authorization logic  |   +----------------------+
                     +----------------------+
```

### Responsibility boundaries

  -----------------------------------------------------------------------
  Component               Owner                   Responsibility
  ----------------------- ----------------------- -----------------------
  Camera acquisition      Person 1                Capture vehicle
                                                  image/video and provide
                                                  frames to OCR pipeline

  OCR / plate recognition Person 1                Recognize plate text
                                                  and send structured
                                                  result to Raspberry Pi

  Raspberry Pi backend    Person 2                Receive events,
                                                  coordinate recognition,
                                                  apply authorization,
                                                  expose API

  Database                Person 2                Store registered plates
                                                  and access records

  Authorization           Person 2                Decide whether a
                                                  recognized plate is
                                                  allowed

  Arduino firmware        Person 3                Read PIR sensor,
                                                  control servo, process
                                                  gate commands, report
                                                  state

  Web application         Person 3                Display system status,
                                                  manage UI workflows,
                                                  call Raspberry Pi API
  -----------------------------------------------------------------------

**Important:** The Raspberry Pi owns authorization and persistent data.
The browser must not decide whether a vehicle is authorized. The Arduino
controls the physical gate but must not independently implement the
plate database or authorization rules.

------------------------------------------------------------------------

## 3. End-to-end operating sequence

The intended automatic access flow is:

1.  The PIR sensor detects movement near the garage entrance.
2.  Arduino sends `MOTION_DETECTED` to the Raspberry Pi over the agreed
    serial connection.
3.  Raspberry Pi requests or receives a camera frame from the Ultra96
    workflow.
4.  Ultra96 performs license plate recognition.
5.  Ultra96 sends the recognized plate result to the Raspberry Pi.
6.  Raspberry Pi validates the result and checks the plate against its
    database.
7.  Raspberry Pi records the access attempt.
8.  If authorized, Raspberry Pi sends `OPEN` to Arduino. If
    unauthorized, it does not issue an open command.
9.  Arduino operates the servo and reports gate state changes.
10. Raspberry Pi updates the latest event and status exposed by its API.
11. The web application refreshes and displays the plate, authorization
    result, gate status, motion state, and access history.

### Expected unauthorized flow

For an unauthorized plate, the Raspberry Pi records the attempt and
returns an unauthorized result. The gate remains closed unless a
separately defined, approved manual override is used. The web dashboard
displays the denial.

### Manual control flow

1.  An operator clicks OPEN, CLOSE, or STOP in the web application.
2.  The browser sends a request to the Raspberry Pi API.
3.  Raspberry Pi validates the command and forwards it to Arduino.
4.  Arduino executes the command and reports state changes.
5.  Raspberry Pi exposes the resulting state.
6.  The dashboard displays the confirmed state returned by the backend.

The browser must not show a physical gate as OPEN merely because the
user clicked OPEN. It may show a pending/requested state until the
backend confirms the result.

------------------------------------------------------------------------

## 4. Interface A --- Arduino ↔ Raspberry Pi

### 4.1 Proposed transport

**Transport:** USB serial connection between Raspberry Pi and Arduino.

**Current firmware settings from Person 3's simulation:**

-   Serial baud rate: `9600`
-   PIR signal: Arduino digital pin `D2`
-   Servo signal: Arduino digital pin `D9`
-   Command format: newline-terminated text commands
-   Commands currently implemented in simulation: `OPEN`, `CLOSE`,
    `STOP`

These are the current simulated firmware settings. Person 1 / the
hardware integrator must confirm the actual board, wiring, serial device
path, power arrangement, and physical behavior before the final demo.

### 4.2 Raspberry Pi → Arduino commands

  Command   Meaning              Expected Arduino behavior
  --------- -------------------- ----------------------------------------------
  `OPEN`    Open gate            Move servo toward configured open position
  `CLOSE`   Close gate           Move servo toward configured closed position
  `STOP`    Stop gate movement   Stop movement and report stopped state

Each command should be sent as one line ending in `\n`, for example:

``` text
OPEN\n
```

Commands should be uppercase and contain no extra JSON or punctuation
unless the team jointly changes the protocol.

### 4.3 Arduino → Raspberry Pi events

  Message             Meaning
  ------------------- ---------------------------------------
  `MOTION_DETECTED`   PIR detected a new motion event
  `GATE_OPENING`      Gate is moving toward open position
  `GATE_OPEN`         Gate reached its open position
  `GATE_CLOSING`      Gate is moving toward closed position
  `GATE_CLOSED`       Gate reached its closed position
  `GATE_STOPPED`      Gate movement was stopped

Example serial exchange:

``` text
Raspberry Pi -> Arduino: OPEN
Arduino -> Raspberry Pi: GATE_OPENING
Arduino -> Raspberry Pi: GATE_OPEN
```

### 4.4 Serial protocol requirements to agree

Before integration, Person 2 and Person 3 must confirm:

-   Which Raspberry Pi serial device is used (for example,
    `/dev/ttyACM0` or `/dev/ttyUSB0`); do not assume either value.
-   Whether the Arduino sends a startup/ready message.
-   Whether the Pi sends one command at a time and waits for a state
    response.
-   How malformed or unknown commands are handled.
-   Whether a command acknowledgement is needed in addition to state
    events.
-   How duplicate PIR events are debounced or rate-limited.
-   What happens after serial disconnection or reconnection.
-   Whether the gate has physical limit switches or only timed servo
    movement.

**Do not treat a software-reported `GATE_OPEN` as proof of a physical
limit position unless the hardware provides a reliable position
sensor.** If the current design uses timed servo movement, document the
state as software-estimated.

### 4.5 Safety and hardware checks

The simulation does not prove physical safety. Before operating a real
gate:

-   Confirm servo power requirements and common ground.
-   Do not assume the Arduino 5V pin can safely power the servo under
    load.
-   Verify the servo's mechanical range and avoid forcing it against its
    stops.
-   Define a safe behavior for power loss, serial failure, and reset.
-   Test STOP behavior physically.
-   Assess pinch/crush hazards and provide suitable mechanical
    protection.
-   Do not rely on the PIR sensor as an obstruction-detection safety
    device.
-   Add physical obstruction detection / limit sensing if required by
    the mechanism and risk assessment.

------------------------------------------------------------------------

## 5. Interface B --- Ultra96 / OCR ↔ Raspberry Pi

Person 1 owns the camera and OCR pipeline. Person 2 owns the Raspberry
Pi service that receives OCR results and coordinates the workflow.

### 5.1 Proposed OCR result payload

The following is a **proposed integration payload**, not a confirmed
existing API:

``` json
{
  "plate": "123TUN4567",
  "confidence": 0.97,
  "timestamp": "2026-11-22T10:15:30Z"
}
```

Field definitions:

  -----------------------------------------------------------------------
  Field             Type              Requirement       Description
  ----------------- ----------------- ----------------- -----------------
  `plate`           string            Required          Normalized
                                                        recognized plate
                                                        text

  `confidence`      number            Recommended       OCR confidence,
                                                        ideally in range
                                                        0--1

  `timestamp`       string            Recommended       Recognition time
                                                        in ISO 8601
                                                        format
  -----------------------------------------------------------------------

The team must agree on the transport method (HTTP endpoint, socket,
message queue, or another method), endpoint/address, authentication if
applicable, timeout, retry policy, and error payload. Do not assume a
URL or endpoint before Person 1 and Person 2 confirm it.

### 5.2 OCR quality and failure cases

Person 1 should communicate how the system represents:

-   No plate detected.
-   Multiple plates detected.
-   Low-confidence recognition.
-   Unreadable or partially read plate.
-   Camera unavailable.
-   OCR processing failure.

The Raspberry Pi should not authorize an uncertain or empty plate. The
exact confidence threshold and normalization rules must be agreed and
documented by Person 1 and Person 2.

------------------------------------------------------------------------

## 6. Interface C --- Web Application ↔ Raspberry Pi API

### 6.1 Ownership

-   Person 2 implements and documents the REST API.
-   Person 3 implements the browser-side API client and UI.
-   The browser must not connect directly to the database or serial
    port.
-   The browser must not contain authorization logic or secrets.

The endpoint paths below are **API requirements to implement or map**,
not claims that these routes already exist. Person 2 must confirm the
final paths, HTTP methods, request bodies, response schemas, and error
formats.

### 6.2 Required API capabilities

  -----------------------------------------------------------------------
  Capability              Suggested method        Purpose
  ----------------------- ----------------------- -----------------------
  Read current system     `GET`                   Gate, motion, camera,
  status                                          latest plate and system
                                                  connectivity

  Read recent access      `GET`                   Dashboard event list
  events                                          

  Read access history     `GET`                   Full or paginated
                                                  access history

  List registered plates  `GET`                   License plate
                                                  management page

  Add a plate             `POST`                  Register a new
                                                  authorized plate

  Update a plate          `PUT` or `PATCH`        Edit plate / owner /
                                                  status

  Delete a plate          `DELETE`                Remove a registered
                                                  plate

  Request gate action     `POST`                  Request OPEN, CLOSE, or
                                                  STOP

  Read camera stream      `GET` or documented     Provide camera preview
  information             stream URL              integration
  -----------------------------------------------------------------------

### 6.3 Example status response

This example is a proposed response shape based on the dashboard
requirements:

``` json
{
  "plate": "123TUN4567",
  "authorized": true,
  "gate_status": "OPEN",
  "motion_detected": true
}
```

For a more complete dashboard, the team may agree to extend it:

``` json
{
  "system_mode": "LIVE",
  "gate_status": "CLOSED",
  "motion_detected": false,
  "camera_status": "CONNECTED",
  "latest_access": {
    "plate": "123TUN4567",
    "authorized": true,
    "timestamp": "2026-11-22T10:15:30Z"
  }
}
```

These are examples only. Person 2 must define the authoritative schema
and allowed values.

### 6.4 Example gate command request

Proposed request:

``` http
POST /api/gate/command
Content-Type: application/json
```

``` json
{
  "command": "OPEN"
}
```

Possible response shape:

``` json
{
  "accepted": true,
  "requested_command": "OPEN",
  "gate_status": "OPENING",
  "message": "Command accepted"
}
```

The response should distinguish between a command being accepted and the
gate physically reaching its target state.

### 6.5 API contract checklist for Person 2

Person 2 must provide Person 3 with:

1.  Raspberry Pi base URL and port.
2.  Final endpoint list and HTTP methods.
3.  Request and response JSON examples for every endpoint.
4.  Allowed enum values for gate, camera, motion, and authorization
    statuses.
5.  Date/time format and timezone convention.
6.  Pagination and filtering parameters for access history.
7.  Validation rules for license plates.
8.  Error response format and HTTP status codes.
9.  Authentication/CORS requirements, if any.
10. Camera stream URL, format, and browser compatibility requirements.
11. Expected refresh rate / polling interval or real-time update
    mechanism.
12. Instructions to run the backend locally and on the Raspberry Pi.

### 6.6 Browser integration rules for Person 3

-   Keep API base URL in one configuration file.
-   Keep HTTP requests in a dedicated API module.
-   Use `fetch()` and handle network errors, non-2xx responses, invalid
    JSON, and timeouts.
-   Display loading, empty, disconnected, and error states.
-   Never silently replace a failed live API response with mock data.
-   Clearly distinguish `SIMULATION` from `LIVE` mode.
-   Do not store credentials or secrets in frontend source code.
-   Do not let the browser claim a gate command succeeded until the
    backend confirms it.
-   Use the backend's response as the source of truth for gate and
    authorization status.

Until Person 2 provides the final API contract, the frontend must remain
in clearly labeled simulation mode.

------------------------------------------------------------------------

## 7. Shared data model

The team should align on these core concepts.

### 7.1 License plate

``` json
{
  "plate": "123TUN4567",
  "owner": "Example Owner",
  "authorized": true,
  "created_at": "2026-11-22T10:00:00Z"
}
```

### 7.2 Access event

``` json
{
  "id": "event-001",
  "plate": "123TUN4567",
  "authorized": true,
  "timestamp": "2026-11-22T10:15:30Z",
  "gate_status": "OPEN",
  "reason": "AUTHORIZED_PLATE"
}
```

These are proposed shared data shapes. Person 2 should own the final
database schema and API serialization.

### 7.3 Recommended status vocabulary

  Domain             Suggested values
  ------------------ --------------------------------------------------------------
  Gate               `CLOSED`, `OPENING`, `OPEN`, `CLOSING`, `STOPPED`, `UNKNOWN`
  Motion             `DETECTED`, `NO_MOTION`, `UNKNOWN`
  Authorization      `AUTHORIZED`, `UNAUTHORIZED`, `PENDING`, `UNKNOWN`
  Camera             `CONNECTED`, `DISCONNECTED`, `ERROR`, `UNKNOWN`
  Application mode   `SIMULATION`, `LIVE`

Use the same spelling and capitalization across Arduino messages,
Raspberry Pi backend, and web application. If the team chooses different
values, update this document and all implementations together.

------------------------------------------------------------------------

## 8. Integration sequence and ownership

  --------------------------------------------------------------------------
  Step              Task              Owner             Output / handoff
  ----------------- ----------------- ----------------- --------------------
  1                 Finalize Arduino  Person 2 + Person Agreed commands,
                    serial protocol   3                 events, baud rate,
                                                        serial settings

  2                 Verify PIR and    Hardware owner /  Wiring diagram and
                    servo on physical Person 1 + Person physical test
                    hardware          3                 results

  3                 Finalize OCR      Person 1 + Person OCR payload,
                    output contract   2                 transport, error
                                                        cases

  4                 Implement Pi      Person 2          Working Pi ↔ Arduino
                    serial listener                     communication
                    and command                         
                    sender                              

  5                 Integrate OCR     Person 1 + Person End-to-end
                    result into       2                 recognized plate
                    authorization                       decision
                    workflow                            

  6                 Publish and       Person 2          API contract and
                    document REST API                   running base URL

  7                 Connect frontend  Person 3          Live dashboard and
                    to real API                         management pages

  8                 Integrate camera  Person 1 + Person Browser-compatible
                    stream            2 + Person 3      stream

  9                 Run full system   All members       Test evidence and
                    tests                               demo checklist
  --------------------------------------------------------------------------

Do not integrate all components simultaneously. First verify each
interface independently, then connect them one at a time.

------------------------------------------------------------------------

## 9. Integration test plan

Record each test as **PASS**, **FAIL**, or **NOT TESTED**, with
evidence.

### Test A --- Arduino serial

-   [ ] Raspberry Pi detects the correct Arduino serial device.
-   [ ] Pi sends `OPEN`; Arduino reports `GATE_OPENING` and then
    `GATE_OPEN`.
-   [ ] Pi sends `CLOSE`; Arduino reports `GATE_CLOSING` and then
    `GATE_CLOSED`.
-   [ ] Pi sends `STOP`; Arduino reports `GATE_STOPPED`.
-   [ ] PIR activation produces `MOTION_DETECTED`.
-   [ ] Disconnect/reconnect behavior is understood and tested.

### Test B --- Camera and OCR

-   [ ] Ultra96 receives a camera frame.
-   [ ] OCR recognizes a known test plate.
-   [ ] OCR sends a valid payload to the Raspberry Pi.
-   [ ] No-plate and low-confidence cases are handled.
-   [ ] Camera/OCR failure is reported clearly.

### Test C --- Backend and database

-   [ ] Backend receives motion events.
-   [ ] Backend receives OCR results.
-   [ ] Registered authorized plate is accepted.
-   [ ] Unknown or unauthorized plate is denied.
-   [ ] Every access attempt is stored.
-   [ ] Gate commands are forwarded to Arduino.
-   [ ] API status reflects backend/device state.

### Test D --- Web application

-   [ ] Dashboard loads status from the API.
-   [ ] Dashboard shows disconnected/error state when API is
    unavailable.
-   [ ] License plate list loads from backend.
-   [ ] Add/edit/delete actions use the API.
-   [ ] Access history loads and filters correctly.
-   [ ] OPEN/CLOSE/STOP send commands through the API.
-   [ ] UI displays confirmed status, not just requested status.
-   [ ] Camera stream displays only when a real compatible stream is
    available.

### Test E --- Full demonstration

-   [ ] Vehicle/motion event is detected.
-   [ ] Camera image is acquired.
-   [ ] Plate is recognized.
-   [ ] Backend makes the authorization decision.
-   [ ] Authorized vehicle opens the gate.
-   [ ] Unauthorized vehicle does not trigger automatic opening.
-   [ ] Dashboard displays the event and resulting gate state.

------------------------------------------------------------------------

## 10. Failure handling expectations

  -----------------------------------------------------------------------
  Failure                             Expected system behavior
  ----------------------------------- -----------------------------------
  Arduino disconnected                Backend marks Arduino/gate state
                                      unavailable; no false success

  Ultra96/camera disconnected         Report camera/OCR unavailable; do
                                      not invent a plate

  OCR returns empty/low-confidence    Do not authorize; record or report
  plate                               recognition failure

  Raspberry Pi API unavailable        Web application shows disconnected
                                      state and disables live actions

  Gate command rejected               UI displays the backend error

  Gate response times out             Show unknown/pending state; do not
                                      assume movement succeeded

  Database unavailable                Backend reports an error and does
                                      not claim authorization succeeded
  -----------------------------------------------------------------------

The team must agree on safe physical behavior for device failure.
Software status messages alone do not provide physical safety.

------------------------------------------------------------------------

## 11. Decisions still requiring team confirmation

The following are intentionally left open because they are not
established by the current project handoff:

-   [ ] Exact Arduino model and physical wiring.
-   [ ] Raspberry Pi model, operating system, and serial device path.
-   [ ] Serial baud rate and complete message/acknowledgement protocol.
-   [ ] Whether serial commands/events need message IDs or checksums.
-   [ ] Ultra96-to-Pi transport method and address.
-   [ ] Final OCR JSON schema and confidence threshold.
-   [ ] REST API base URL, endpoints, methods, and schemas.
-   [ ] Authentication and CORS policy.
-   [ ] Camera stream protocol and URL.
-   [ ] Polling interval or real-time event mechanism.
-   [ ] Physical gate position/limit sensing and obstruction safety.
-   [ ] Timezone convention for stored and displayed timestamps.

Do not treat a proposed example in this document as an implemented
endpoint or confirmed protocol until the responsible owners agree.

------------------------------------------------------------------------

## 12. Required handoff from each member

### Person 1 --- Ultra96 / OCR

Provide: - Camera connection and startup instructions. - OCR pipeline
startup instructions. - OCR input/output description. - Final OCR
payload example. - Ultra96-to-Raspberry Pi transport details. -
Recognition failure cases and confidence behavior. - Sample successful
and unsuccessful recognition test results.

### Person 2 --- Raspberry Pi / Backend

Provide: - Backend setup and startup instructions. - Database schema
overview. - Arduino serial interface implementation details. - OCR
receiving interface details. - Authorization rules and plate
normalization rules. - Complete REST API contract. - API base URL and
example requests/responses. - Error handling and device connection
status behavior.

### Person 3 --- Arduino / Web Application

Provide: - Arduino firmware source and pin/wiring documentation. -
Confirmed serial command/event list. - Simulation results, clearly
separated from physical test results. - Frontend source and run
instructions. - API client configuration and list of API capabilities
consumed. - Screenshots and frontend test results.

------------------------------------------------------------------------

## 13. Final integration principle

**One owner per responsibility, one agreed contract per interface, and
one source of truth per type of data.**

-   Ultra96 is the source of plate-recognition results.
-   Raspberry Pi is the source of authorization decisions, registered
    plates, and access history.
-   Arduino is responsible for physical gate actuation and its reported
    device state.
-   Web application is the operator interface; it displays
    backend/device information and sends permitted requests.

The project is not fully integrated until the physical hardware, OCR
workflow, backend, database, and browser application have been tested
together. Simulation and frontend-only behavior must be reported
separately from real hardware validation.
