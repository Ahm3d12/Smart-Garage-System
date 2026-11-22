export function renderCamera(mount, options = {}) {
  if (!mount) {
    return;
  }

  const source = options.source || "Ultra96";

  mount.innerHTML = `
    <article class="card camera-card">
      <header class="card__header">
        <div class="card__title">
          <h2>Camera stream</h2>
          <p>License plate camera feed</p>
        </div>
        <div class="card__actions">
          <span class="badge badge--neutral">
            <i data-lucide="wifi-off" aria-hidden="true"></i>
            Not connected
          </span>
        </div>
      </header>

      <div class="card__body">
        <div class="camera-stage" role="img" aria-label="Camera stream placeholder, no signal">
          <span class="camera-stage__tag">NO SIGNAL</span>
          <div class="camera-stage__content">
            <span class="camera-stage__icon">
              <i data-lucide="camera-off" aria-hidden="true"></i>
            </span>
            <p class="camera-stage__title">Camera feed not integrated</p>
            <p class="camera-stage__text">
              The ${source} video stream will appear here once a live camera feed is available.
            </p>
          </div>
        </div>
      </div>

      <footer class="camera-meta">
        <div>
          <span>Source</span>
          <strong>${source}</strong>
        </div>
        <div>
          <span>Resolution</span>
          <strong>Not available</strong>
        </div>
        <div>
          <span>Frame rate</span>
          <strong>Not available</strong>
        </div>
        <div>
          <span>Stream</span>
          <strong class="text-muted">Offline</strong>
        </div>
      </footer>
    </article>
  `;
}
