export const APP_CONFIG = {
  appName: "Smart Garage",
  appTagline: "Access Control",
  phaseLabel: "Phase 1 · UI foundation",
  previewLabel: "UI preview",
  api: {
    baseUrl: "",
    enabled: false,
    timeoutMs: 8000
  },
  navigation: [
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard", file: "index.html" },
    { id: "plates", label: "License Plates", icon: "scan-line", file: "pages/plates.html" },
    { id: "history", label: "Access History", icon: "history", file: "pages/history.html" },
    { id: "system", label: "System Information", icon: "cpu", file: "pages/system.html" }
  ],
  dashboard: {
    gate: {
      initialState: "CLOSED",
      openDurationMs: 2000,
      closeDurationMs: 1600
    },
    motion: {
      detected: false,
      sensor: "HC-SR501",
      zone: "Zone A"
    },
    latestPlate: {
      plate: "KJ-482-LM",
      confidence: 96,
      source: "Ultra96",
      capturedAt: "2 min ago"
    },
    authorization: {
      status: "AUTHORIZED",
      reason: "Resident plate matched"
    },
    recentEvents: [
      { plate: "KJ-482-LM", dateTime: "22 Nov 2026, 14:32", authorization: "Authorized", gateStatus: "OPEN" },
      { plate: "AX-214-TZ", dateTime: "22 Nov 2026, 14:28", authorization: "Authorized", gateStatus: "OPEN" },
      { plate: "MZ-908-QR", dateTime: "22 Nov 2026, 13:05", authorization: "Authorized", gateStatus: "CLOSED" },
      { plate: "TV-117-BN", dateTime: "22 Nov 2026, 11:48", authorization: "Denied", gateStatus: "CLOSED" },
      { plate: "PK-640-WD", dateTime: "22 Nov 2026, 10:16", authorization: "Expired", gateStatus: "CLOSED" }
    ]
  },
  sample: {
    events: [
      { id: 1, time: "14:32", date: "22 Nov 2026", plate: "KJ-482-LM", direction: "Entry", gate: "Main gate", status: "Authorized", gateStatus: "OPEN", confidence: 96 },
      { id: 2, time: "14:28", date: "22 Nov 2026", plate: "AX-214-TZ", direction: "Entry", gate: "Main gate", status: "Authorized", gateStatus: "OPEN", confidence: 94 },
      { id: 3, time: "13:05", date: "22 Nov 2026", plate: "MZ-908-QR", direction: "Exit", gate: "Main gate", status: "Authorized", gateStatus: "CLOSED", confidence: 91 },
      { id: 4, time: "11:48", date: "22 Nov 2026", plate: "TV-117-BN", direction: "Entry", gate: "Main gate", status: "Denied", gateStatus: "CLOSED", confidence: 88 },
      { id: 5, time: "10:16", date: "22 Nov 2026", plate: "PK-640-WD", direction: "Entry", gate: "Main gate", status: "Expired", gateStatus: "CLOSED", confidence: 90 },
      { id: 6, time: "09:42", date: "22 Nov 2026", plate: "KJ-482-LM", direction: "Exit", gate: "Main gate", status: "Authorized", gateStatus: "CLOSED", confidence: 97 },
      { id: 7, time: "08:57", date: "22 Nov 2026", plate: "AX-214-TZ", direction: "Entry", gate: "Main gate", status: "Authorized", gateStatus: "OPEN", confidence: 93 },
      { id: 8, time: "08:20", date: "22 Nov 2026", plate: "ZZ-001-AA", direction: "Entry", gate: "Main gate", status: "Denied", gateStatus: "CLOSED", confidence: 76 }
    ],
    plates: [
      { plate: "KJ-482-LM", owner: "Elena Marin", vehicle: "Toyota Corolla", accessLevel: "Resident", registrationStatus: "Registered", lastSeen: "Today, 14:32", status: "Authorized", confidence: 96 },
      { plate: "AX-214-TZ", owner: "Marcus Hale", vehicle: "Honda Civic", accessLevel: "Guest", registrationStatus: "Registered", lastSeen: "Today, 14:28", status: "Authorized", confidence: 94 },
      { plate: "MZ-908-QR", owner: "Nadia Popa", vehicle: "Nissan Qashqai", accessLevel: "Resident", registrationStatus: "Registered", lastSeen: "Today, 13:05", status: "Authorized", confidence: 91 },
      { plate: "TV-117-BN", owner: "Unknown", vehicle: "Unknown vehicle", accessLevel: "Blocked", registrationStatus: "Blocked", lastSeen: "Today, 11:48", status: "Denied", confidence: 88 },
      { plate: "PK-640-WD", owner: "Guest visitor", vehicle: "Volkswagen Golf", accessLevel: "Guest", registrationStatus: "Expired", lastSeen: "Today, 10:16", status: "Expired", confidence: 90 },
      { plate: "RT-553-KX", owner: "Daniel Ionescu", vehicle: "Hyundai Tucson", accessLevel: "Resident", registrationStatus: "Registered", lastSeen: "Yesterday, 18:41", status: "Authorized", confidence: 95 }
    ]
  },
  recentEventLimit: 5
};
