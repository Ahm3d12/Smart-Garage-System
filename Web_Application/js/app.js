import { APP_CONFIG } from "./config.js";
import { garageApi } from "./api.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderStatusPanel } from "./components/status_panel.js";
import { renderCamera } from "./components/camera.js";
import { renderGateControls } from "./components/gate_controls.js";

const STATUS_TONES = {
  Authorized: "success",
  Denied: "danger",
  Expired: "warning"
};

const GATE_STATUS_VIEWS = {
  CLOSED: {
    icon: "lock",
    badge: "Secure",
    tone: "success",
    meta: "Gate closed · servo at rest"
  },
  OPENING: {
    icon: "unlock",
    badge: "Opening",
    tone: "info",
    meta: "Gate opening · simulated servo"
  },
  OPEN: {
    icon: "unlock",
    badge: "Open",
    tone: "warning",
    meta: "Gate fully open · entrance clear"
  },
  CLOSING: {
    icon: "lock",
    badge: "Closing",
    tone: "info",
    meta: "Gate closing · simulated servo"
  },
  STOPPED: {
    icon: "alert-triangle",
    badge: "Stopped",
    tone: "danger",
    meta: "Gate stopped mid-travel"
  }
};

function normalizeGateState(value) {
  const state = String(value || "CLOSED").toUpperCase();
  return GATE_STATUS_VIEWS[state] ? state : "CLOSED";
}

function buildDashboardStatus(gateState) {
  const { motion, latestPlate, authorization } = APP_CONFIG.dashboard;
  const gate = GATE_STATUS_VIEWS[gateState];
  const authorizationStatus = String(authorization.status || "UNAUTHORIZED").toUpperCase();
  const authorized = authorizationStatus === "AUTHORIZED";

  return [
    {
      id: "gate",
      icon: gate.icon,
      label: "Gate status",
      value: gateState,
      badge: gate.badge,
      tone: gate.tone,
      meta: gate.meta
    },
    {
      id: "motion",
      icon: "activity",
      label: "Motion detection",
      value: motion.detected ? "DETECTED" : "NO MOTION",
      badge: motion.detected ? "Detected" : "Clear",
      tone: motion.detected ? "warning" : "neutral",
      meta: `${motion.sensor} · ${motion.zone}`
    },
    {
      id: "plate",
      icon: "scan-line",
      label: "Latest license plate",
      value: latestPlate.plate,
      badge: `${latestPlate.confidence}% match`,
      tone: "info",
      meta: `${latestPlate.source} recognition · ${latestPlate.capturedAt}`
    },
    {
      id: "authorization",
      icon: authorized ? "shield-check" : "shield-x",
      label: "Authorization",
      value: authorizationStatus,
      badge: authorized ? "Granted" : "Denied",
      tone: authorized ? "success" : "danger",
      meta: authorization.reason
    }
  ];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}

function statusBadge(status) {
  const tone = STATUS_TONES[status] || "neutral";
  return `<span class="badge badge--${tone}">${escapeHtml(status)}</span>`;
}

function directionMarkup(direction) {
  const icon = direction === "Entry" ? "arrow-down-left" : "arrow-up-right";
  return `<span class="direction"><i data-lucide="${icon}" aria-hidden="true"></i>${escapeHtml(direction)}</span>`;
}

function confidenceMarkup(value) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return `
    <span class="confidence">
      <span class="confidence__track"><span class="confidence__fill" style="width: ${safeValue}%"></span></span>
      ${safeValue}%
    </span>
  `;
}

function eventRowsMarkup(events, includeDate) {
  return events
    .map((event) => {
      const dateCell = includeDate
        ? `<td>${escapeHtml(event.date || "Sample date")}</td>`
        : "";

      return `
        <tr>
          ${dateCell}
          <td><strong>${escapeHtml(event.time)}</strong></td>
          <td><span class="plate-code">${escapeHtml(event.plate)}</span></td>
          <td>${directionMarkup(event.direction)}</td>
          <td>${escapeHtml(event.gate)}</td>
          <td>${statusBadge(event.status)}</td>
          <td>${confidenceMarkup(event.confidence)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function dashboardEventRowsMarkup(events) {
  return events
    .map((event) => `
      <tr>
        <td><span class="plate-code">${escapeHtml(event.plate)}</span></td>
        <td>${escapeHtml(event.dateTime)}</td>
        <td>${statusBadge(event.authorization)}</td>
        <td>${escapeHtml(event.gateStatus)}</td>
      </tr>
    `)
    .join("");
}

function initDashboard() {
  const statusMount = document.getElementById("status-panel");
  const cameraMount = document.getElementById("camera-root");
  const controlsMount = document.getElementById("gate-controls-root");
  const eventsBody = document.getElementById("recent-events-body");
  const gateConfig = APP_CONFIG.dashboard.gate;
  const initialGateState = normalizeGateState(gateConfig.initialState);

  renderStatusPanel(statusMount, buildDashboardStatus(initialGateState));
  renderCamera(cameraMount, { source: APP_CONFIG.dashboard.latestPlate.source });
  renderGateControls(controlsMount, {
    initialState: initialGateState,
    openDurationMs: gateConfig.openDurationMs,
    closeDurationMs: gateConfig.closeDurationMs,
    onStateChange: ({ state }) => {
      renderStatusPanel(statusMount, buildDashboardStatus(state));
      renderIcons();
    }
  });

  if (eventsBody) {
    const recentEvents = APP_CONFIG.dashboard.recentEvents.slice(0, APP_CONFIG.recentEventLimit);
    eventsBody.innerHTML = dashboardEventRowsMarkup(recentEvents);
  }
}

let platesData = [];
let editingPlate = null;

function registrationStatusTone(status) {
  if (status === "Registered") return "success";
  if (status === "Blocked") return "danger";
  if (status === "Expired") return "warning";
  return "neutral";
}

function plateStatusFromRegistration(status) {
  if (status === "Blocked") return "Denied";
  if (status === "Expired") return "Expired";
  return "Authorized";
}

function resetPlateForm(form) {
  form.reset();
  form.querySelector("#plate-id").value = "";
  editingPlate = null;
  const saveButton = form.querySelector("#plate-save-button");
  if (saveButton) saveButton.textContent = "Save plate";
}

function renderPlatesPage() {
  const tableBody = document.getElementById("plates-body");
  const emptyState = document.getElementById("plates-empty");
  const searchInput = document.getElementById("plate-search");
  const statusSelect = document.getElementById("plate-status");
  if (!tableBody) return;

  const query = (searchInput?.value || "").trim().toLowerCase();
  const statusFilter = statusSelect?.value || "all";

  const filtered = platesData.filter((plate) => {
    const matchesQuery =
      !query ||
      plate.plate.toLowerCase().includes(query) ||
      plate.owner.toLowerCase().includes(query) ||
      plate.vehicle.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || plate.registrationStatus === statusFilter;
    return matchesQuery && matchesStatus;
  });

  tableBody.innerHTML = filtered
    .map(
      (plate) => `
        <tr>
          <td><span class="plate-code">${escapeHtml(plate.plate)}</span></td>
          <td><strong>${escapeHtml(plate.owner)}</strong></td>
          <td>${escapeHtml(plate.accessLevel)}</td>
          <td><span class="badge badge--${registrationStatusTone(plate.registrationStatus)}">${escapeHtml(plate.registrationStatus)}</span></td>
          <td>${escapeHtml(plate.lastSeen)}</td>
          <td>${confidenceMarkup(plate.confidence)}</td>
          <td>
            <span class="table-actions">
              <button class="button button--secondary button--sm" type="button" data-plate-action="edit" data-plate="${escapeHtml(plate.plate)}">Edit</button>
              <button class="button button--danger button--sm" type="button" data-plate-action="delete" data-plate="${escapeHtml(plate.plate)}">Delete</button>
            </span>
          </td>
        </tr>
      `
    )
    .join("");

  if (emptyState) {
    emptyState.hidden = filtered.length !== 0;
  }
}

function initPlatesPage() {
  const tableBody = document.getElementById("plates-body");
  if (!tableBody) return;

  platesData = APP_CONFIG.sample.plates.map((plate) => ({ ...plate }));
  const formCard = document.getElementById("plate-form-card");
  const form = document.getElementById("plate-form");
  const searchInput = document.getElementById("plate-search");
  const statusSelect = document.getElementById("plate-status");
  const addButton = document.getElementById("plate-add-button");
  const cancelButton = document.getElementById("plate-cancel-button");

  function showForm(plate = null) {
    if (!formCard || !form) return;
    formCard.hidden = false;
    if (plate) {
      editingPlate = plate.plate;
      form.querySelector("#plate-id").value = plate.plate;
      form.querySelector("#plate-value").value = plate.plate;
      form.querySelector("#plate-owner").value = plate.owner;
      form.querySelector("#plate-vehicle").value = plate.vehicle;
      form.querySelector("#plate-access").value = plate.accessLevel;
      form.querySelector("#plate-registration").value = plate.registrationStatus;
      form.querySelector("#plate-last-seen").value = plate.lastSeen;
      const saveButton = form.querySelector("#plate-save-button");
      if (saveButton) saveButton.textContent = "Update plate";
    } else {
      resetPlateForm(form);
    }
    form.querySelector("#plate-value")?.focus();
  }

  function hideForm() {
    if (formCard) formCard.hidden = true;
    if (form) resetPlateForm(form);
  }

  addButton?.addEventListener("click", () => showForm());
  cancelButton?.addEventListener("click", hideForm);

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const plateValue = form.querySelector("#plate-value").value.trim().toUpperCase();
    const owner = form.querySelector("#plate-owner").value.trim();
    const vehicle = form.querySelector("#plate-vehicle").value.trim();
    const accessLevel = form.querySelector("#plate-access").value;
    const registrationStatus = form.querySelector("#plate-registration").value;
    const lastSeen = form.querySelector("#plate-last-seen").value.trim() || "Just added";

    if (!plateValue || !owner || !vehicle) return;

    const duplicate = platesData.some(
      (plate) => plate.plate === plateValue && plate.plate !== editingPlate
    );
    if (duplicate) {
      window.alert("A plate with this number already exists.");
      return;
    }

    const record = {
      plate: plateValue,
      owner,
      vehicle,
      accessLevel,
      registrationStatus,
      lastSeen,
      status: plateStatusFromRegistration(registrationStatus),
      confidence: 90
    };

    if (editingPlate) {
      const index = platesData.findIndex((plate) => plate.plate === editingPlate);
      if (index >= 0) platesData[index] = record;
    } else {
      platesData.unshift(record);
    }

    hideForm();
    renderPlatesPage();
    renderIcons();
  });

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-plate-action]");
    if (!button) return;
    const plateNumber = button.dataset.plate;
    const plate = platesData.find((item) => item.plate === plateNumber);
    if (!plate) return;

    if (button.dataset.plateAction === "edit") {
      showForm(plate);
    }

    if (button.dataset.plateAction === "delete") {
      const confirmed = window.confirm(`Delete plate ${plateNumber}?`);
      if (!confirmed) return;
      platesData = platesData.filter((item) => item.plate !== plateNumber);
      if (editingPlate === plateNumber) hideForm();
      renderPlatesPage();
      renderIcons();
    }
  });

  searchInput?.addEventListener("input", () => {
    renderPlatesPage();
    renderIcons();
  });
  statusSelect?.addEventListener("change", () => {
    renderPlatesPage();
    renderIcons();
  });

  renderPlatesPage();
}

let historyData = [];

function isAuthorizedEvent(event) {
  return String(event.status).toLowerCase() === "authorized";
}

function isUnauthorizedEvent(event) {
  const status = String(event.status).toLowerCase();
  return status === "denied" || status === "expired";
}

function historyRowsMarkup(events) {
  return events
    .map(
      (event) => `
        <tr>
          <td><span class="plate-code">${escapeHtml(event.plate)}</span></td>
          <td>${escapeHtml(`${event.date}, ${event.time}`)}</td>
          <td>${statusBadge(event.status)}</td>
          <td>${escapeHtml(event.gateStatus || "CLOSED")}</td>
        </tr>
      `
    )
    .join("");
}

function renderHistoryPage() {
  const tableBody = document.getElementById("history-events-body");
  const emptyState = document.getElementById("history-empty");
  const searchInput = document.getElementById("history-search");
  const resultSelect = document.getElementById("history-result");
  if (!tableBody) return;

  const query = (searchInput?.value || "").trim().toLowerCase();
  const resultFilter = resultSelect?.value || "all";

  const filtered = historyData.filter((event) => {
    const matchesPlate = !query || String(event.plate).toLowerCase().includes(query);
    const matchesResult =
      resultFilter === "all" ||
      (resultFilter === "authorized" && isAuthorizedEvent(event)) ||
      (resultFilter === "unauthorized" && isUnauthorizedEvent(event));
    return matchesPlate && matchesResult;
  });

  tableBody.innerHTML = historyRowsMarkup(filtered);
  if (emptyState) emptyState.hidden = filtered.length !== 0;
}

function initHistoryPage() {
  const tableBody = document.getElementById("history-events-body");
  if (!tableBody) return;

  historyData = APP_CONFIG.sample.events.map((event) => ({ ...event }));
  const searchInput = document.getElementById("history-search");
  const resultSelect = document.getElementById("history-result");
  const summaryMount = document.getElementById("history-summary");

  searchInput?.addEventListener("input", () => {
    renderHistoryPage();
    renderIcons();
  });
  resultSelect?.addEventListener("change", () => {
    renderHistoryPage();
    renderIcons();
  });

  renderHistoryPage();

  if (summaryMount) {
    const counts = historyData.reduce(
      (result, event) => {
        result.total += 1;
        if (isAuthorizedEvent(event)) result.authorized += 1;
        if (isUnauthorizedEvent(event)) result.unauthorized += 1;
        return result;
      },
      { total: 0, authorized: 0, unauthorized: 0 }
    );

    const summaryItems = [
      { label: "Total events", value: counts.total, hint: "sample" },
      { label: "Authorized", value: counts.authorized, hint: "granted" },
      { label: "Unauthorized", value: counts.unauthorized, hint: "blocked" }
    ];

    summaryMount.innerHTML = summaryItems
      .map(
        (item) => `
          <div class="summary-item">
            <p class="summary-item__label">${item.label}</p>
            <p class="summary-item__value">${item.value}<span>${item.hint}</span></p>
          </div>
        `
      )
      .join("");
  }
}

function initSystemPage() {
  const apiState = document.getElementById("api-config-state");
  if (apiState) {
    apiState.textContent = garageApi.isConfigured ? "Configured" : "Not configured";
  }
}

function init() {
  renderSidebar();

  const page = document.body.dataset.page || "dashboard";
  if (page === "dashboard") {
    initDashboard();
  } else if (page === "plates") {
    initPlatesPage();
  } else if (page === "history") {
    initHistoryPage();
  } else if (page === "system") {
    initSystemPage();
  }

  renderIcons();
}

init();
