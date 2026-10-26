window.__deferredPwaPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.__deferredPwaPrompt = event;
  window.dispatchEvent(
    new CustomEvent("pwa-install-available", { detail: event }),
  );
});
window.addEventListener("appinstalled", () => {
  window.__deferredPwaPrompt = null;
});
if ("serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        window.addEventListener("focus", () => reg.update());
      })
      .catch(() => {});
  });
