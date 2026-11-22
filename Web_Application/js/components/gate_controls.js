const GATE_STATES = ["CLOSED", "OPENING", "OPEN", "CLOSING", "STOPPED"];
const MOVING_STATES = new Set(["OPENING", "CLOSING"]);
const TICK_MS = 50;

function normalizeState(value) {
  const state = String(value || "CLOSED").toUpperCase();
  return GATE_STATES.includes(state) ? state : "CLOSED";
}

export function renderGateControls(mount, options = {}) {
  if (!mount) {
    return null;
  }

  const initialState = normalizeState(options.initialState);
  const openDurationMs = Number(options.openDurationMs) || 2000;
  const closeDurationMs = Number(options.closeDurationMs) || 1600;
  const onStateChange = typeof options.onStateChange === "function" ? options.onStateChange : () => {};

  let state = initialState;
  let position = state === "OPEN" ? 100 : 0;
  let lastCommand = "None";
  let timer = null;
  let movement = null;

  mount.innerHTML = `
    <article class="card controls-card">
      <header class="card__header">
        <div class="card__title">
          <h2>Gate controls</h2>
          <p>Manual entrance control</p>
        </div>
        <div class="card__actions">
          <span class="badge badge--info">
            <i data-lucide="play" aria-hidden="true"></i>
            Simulation
          </span>
        </div>
      </header>

      <div class="card__body">
        <div class="control-grid control-grid--three">
          <button class="button button--primary button--block" type="button" data-gate-action="open" aria-label="Open gate">
            <i data-lucide="unlock" aria-hidden="true"></i>
            Open
          </button>
          <button class="button button--secondary button--block" type="button" data-gate-action="close" aria-label="Close gate">
            <i data-lucide="lock" aria-hidden="true"></i>
            Close
          </button>
          <button class="button button--danger button--block" type="button" data-gate-action="stop" aria-label="Stop gate movement">
            <i data-lucide="square" aria-hidden="true"></i>
            Stop
          </button>
        </div>

        <div class="gate-meter">
          <div class="gate-meter__head">
            <span>Gate position</span>
            <strong data-gate-position>0% open</strong>
          </div>
          <div class="gate-meter__track" role="progressbar" aria-label="Gate opening position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-gate-meter>
            <span class="gate-meter__fill" data-gate-fill></span>
          </div>
        </div>

        <div class="control-note" id="gate-control-note">
          <i data-lucide="info" aria-hidden="true"></i>
          <span>Frontend simulation only. These buttons animate the gate state in the browser; no servo, Arduino or REST API is connected.</span>
        </div>

        <dl class="control-facts">
          <div>
            <dt>Gate state</dt>
            <dd data-gate-state aria-live="polite">CLOSED</dd>
          </div>
          <div>
            <dt>Actuator</dt>
            <dd>SG90 servo (mock)</dd>
          </div>
          <div>
            <dt>Last command</dt>
            <dd data-gate-last>None</dd>
          </div>
        </dl>
      </div>
    </article>
  `;

  const elements = {
    open: mount.querySelector('[data-gate-action="open"]'),
    close: mount.querySelector('[data-gate-action="close"]'),
    stop: mount.querySelector('[data-gate-action="stop"]'),
    state: mount.querySelector("[data-gate-state]"),
    last: mount.querySelector("[data-gate-last]"),
    position: mount.querySelector("[data-gate-position]"),
    meter: mount.querySelector("[data-gate-meter]"),
    fill: mount.querySelector("[data-gate-fill]")
  };

  function emitState() {
    onStateChange({
      state,
      position,
      lastCommand,
      isMoving: MOVING_STATES.has(state)
    });
  }

  function setPosition(value) {
    position = Math.max(0, Math.min(100, value));
    const rounded = Math.round(position);
    elements.position.textContent = `${rounded}% open`;
    elements.meter.setAttribute("aria-valuenow", String(rounded));
    elements.fill.style.width = `${position}%`;
  }

  function syncState() {
    elements.state.textContent = state;
    elements.last.textContent = lastCommand;
    elements.open.disabled = state === "OPEN" || state === "OPENING";
    elements.close.disabled = state === "CLOSED" || state === "CLOSING";
    elements.stop.disabled = !MOVING_STATES.has(state);

    elements.fill.classList.toggle("is-open", state === "OPEN");
    elements.fill.classList.toggle("is-moving", MOVING_STATES.has(state));
    elements.fill.classList.toggle("is-stopped", state === "STOPPED");
  }

  function clearTimer() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function tick() {
    if (!movement) {
      return;
    }

    const elapsed = Date.now() - movement.startedAt;
    const progress = Math.min(elapsed / movement.durationMs, 1);
    const nextPosition = movement.from + (movement.to - movement.from) * progress;
    setPosition(nextPosition);

    if (progress < 1) {
      return;
    }

    const target = movement.to;
    movement = null;
    clearTimer();
    position = target;
    state = target === 100 ? "OPEN" : "CLOSED";
    setPosition(target);
    syncState();
    emitState();
  }

  function moveTo(targetPosition, movingState, command) {
    clearTimer();

    const distance = Math.abs(targetPosition - position);
    if (distance < 0.5) {
      position = targetPosition;
      state = targetPosition === 100 ? "OPEN" : "CLOSED";
      lastCommand = command;
      setPosition(position);
      syncState();
      emitState();
      return;
    }

    const fullDuration = targetPosition === 100 ? openDurationMs : closeDurationMs;

    state = movingState;
    lastCommand = command;
    movement = {
      from: position,
      to: targetPosition,
      startedAt: Date.now(),
      durationMs: Math.max(160, (fullDuration * distance) / 100)
    };

    syncState();
    emitState();
    timer = window.setInterval(tick, TICK_MS);
  }

  function openGate() {
    if (state === "OPEN" || state === "OPENING") {
      return;
    }
    moveTo(100, "OPENING", "Open");
  }

  function closeGate() {
    if (state === "CLOSED" || state === "CLOSING") {
      return;
    }
    moveTo(0, "CLOSING", "Close");
  }

  function stopGate() {
    if (!MOVING_STATES.has(state)) {
      return;
    }

    clearTimer();
    movement = null;
    state = "STOPPED";
    lastCommand = "Stop";
    setPosition(position);
    syncState();
    emitState();
  }

  elements.open.addEventListener("click", openGate);
  elements.close.addEventListener("click", closeGate);
  elements.stop.addEventListener("click", stopGate);

  setPosition(position);
  syncState();
  emitState();

  return {
    getState: () => state,
    destroy() {
      clearTimer();
      elements.open.removeEventListener("click", openGate);
      elements.close.removeEventListener("click", closeGate);
      elements.stop.removeEventListener("click", stopGate);
    }
  };
}
