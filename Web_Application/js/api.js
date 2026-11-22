import { APP_CONFIG } from "./config.js";

export class GarageApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "GarageApiError";
    this.status = status;
  }
}

class GarageApiClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.enabled = config.enabled;
    this.timeoutMs = config.timeoutMs;
  }

  get isConfigured() {
    return this.enabled && Boolean(this.baseUrl);
  }

  buildUrl(path) {
    const base = this.baseUrl.replace(/\/+$/, "");
    const route = String(path).startsWith("/") ? path : `/${path}`;
    return `${base}${route}`;
  }

  async request(path, options = {}) {
    if (!this.isConfigured) {
      throw new GarageApiError(
        "The garage REST API is not configured. Phase 1 runs with placeholder data only."
      );
    }

    const { headers, ...rest } = options;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(path), {
        ...rest,
        headers: {
          Accept: "application/json",
          ...headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new GarageApiError(`Request failed with status ${response.status}.`, response.status);
      }

      const contentType = response.headers.get("content-type") || "";
      return contentType.includes("application/json") ? response.json() : response.text();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new GarageApiError("The request timed out.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: "GET" });
  }

  post(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      body: JSON.stringify(body)
    });
  }
}

export const garageApi = new GarageApiClient(APP_CONFIG.api);
