const TONES = ["success", "danger", "warning", "info"];

function statusCardMarkup(item) {
  const hasTone = TONES.includes(item.tone);
  const iconTone = hasTone ? ` stat-card__icon--${item.tone}` : "";
  const badgeTone = hasTone ? item.tone : "neutral";
  const valueClass = item.id === "plate" ? " stat-card__value mono" : " stat-card__value";

  return `
    <article class="stat-card" data-status-id="${item.id}">
      <div class="stat-card__top">
        <span class="stat-card__icon${iconTone}">
          <i data-lucide="${item.icon}" aria-hidden="true"></i>
        </span>
        <span class="badge badge--${badgeTone}">${item.badge}</span>
      </div>
      <p class="stat-card__label">${item.label}</p>
      <p class="${valueClass.trim()}">${item.value}</p>
      <p class="stat-card__meta">${item.meta}</p>
    </article>
  `;
}

export function renderStatusPanel(mount, items) {
  if (!mount) {
    return;
  }

  mount.innerHTML = items.map(statusCardMarkup).join("");
}
