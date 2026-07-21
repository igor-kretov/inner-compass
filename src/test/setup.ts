import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: () => undefined,
});

// Keep component tests isolated from Node's process-wide BroadcastChannel.
// The production synchronization path is covered by repository tests instead.
Object.defineProperty(globalThis, "BroadcastChannel", {
  configurable: true,
  value: class TestBroadcastChannel {
    onmessage: ((event: MessageEvent) => void) | null = null;

    postMessage() {}

    close() {}
  },
});

if (typeof Blob.prototype.text !== "function") {
  Object.defineProperty(Blob.prototype, "text", {
    configurable: true,
    value(this: Blob) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsText(this);
      });
    },
  });
}
