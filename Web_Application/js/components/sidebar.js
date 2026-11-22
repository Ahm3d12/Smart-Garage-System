import { APP_CONFIG } from "../config.js";

function navItemMarkup(item, rootPath, currentPage) {
  const isActive = item.id === currentPage;
  const activeClass = isActive ? " is-active" : "";
  const currentAttr = isActive ? ' aria-current="page"' : "";

  return `
    <a class="nav-item${activeClass}" href="${rootPath}${item.file}"${currentAttr}>
      <i data-lucide="${item.icon}" aria-hidden="true"></i>
      <span>${item.label}</span>
    </a>
  `;
}

export function renderSidebar() {
  const mount = document.getElementById("sidebar-root");
  if (!mount) {
    return;
  }

  const rootPath = document.body.dataset.root || "";
  const currentPage = document.body.dataset.page || "dashboard";
  const navMarkup = APP_CONFIG.navigation
    .map((item) => navItemMarkup(item, rootPath, currentPage))
    .join("");

  mount.innerHTML = `
    <aside class="sidebar" id="app-sidebar" aria-label="Main navigation">
      <div class="sidebar__brand">
        <span class="brand-mark">
          <img src="${rootPath}assets/icons/garage-mark.svg" alt="" width="40" height="40">
        </span>
        <span class="brand-copy">
          <span class="brand-name">${APP_CONFIG.appName}</span>
          <span class="brand-tag">${APP_CONFIG.appTagline}</span>
        </span>
        <button class="icon-button sidebar__close" type="button" aria-label="Close navigation">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>

      <nav class="sidebar__nav" aria-label="Primary">
        <span class="nav-label">Overview</span>
        ${navMarkup}
      </nav>

      <div class="sidebar__footer">
        <div class="side-status">
          <div class="side-status__row">
            <span class="side-status__dot" aria-hidden="true"></span>
            API not connected
          </div>
          <p>Frontend foundation only. No live garage data is currently available.</p>
        </div>
        <p class="sidebar__version">${APP_CONFIG.phaseLabel}</p>
      </div>
    </aside>
    <div class="sidebar-scrim" id="sidebar-scrim" aria-hidden="true"></div>
  `;

  const sidebar = document.getElementById("app-sidebar");
  const toggle = document.getElementById("sidebar-toggle");
  const closeButton = sidebar.querySelector(".sidebar__close");
  const scrim = document.getElementById("sidebar-scrim");
  const desktopQuery = window.matchMedia("(min-width: 1024px)");

  const focusableElements = () =>
    Array.from(
      sidebar.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((element) => element.offsetParent !== null);

  function setExpanded(expanded) {
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", expanded ? "Close navigation" : "Open navigation");
    }
  }

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    setExpanded(true);
    closeButton?.focus();
  }

  function closeSidebar(restoreFocus = false) {
    const wasOpen = document.body.classList.contains("sidebar-open");
    document.body.classList.remove("sidebar-open");
    setExpanded(false);
    if (wasOpen && restoreFocus && !desktopQuery.matches) {
      toggle?.focus();
    }
  }

  toggle?.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) {
      closeSidebar(true);
    } else {
      openSidebar();
    }
  });

  closeButton?.addEventListener("click", () => closeSidebar(true));
  scrim?.addEventListener("click", () => closeSidebar(true));

  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("sidebar-open") || desktopQuery.matches) {
      return;
    }

    if (event.key === "Escape") {
      closeSidebar(true);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const elements = focusableElements();
    if (elements.length === 0) {
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) {
      document.body.classList.remove("sidebar-open");
      setExpanded(false);
    }
  });
}
