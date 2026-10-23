/* Preserve previously shared Rock3D section URLs while keeping the QR root as the portal. */
(() => {
  const legacy = new Set(['showcase','engineering','industry','details','journey','case-3d','model-view','rock-canvas','video-dialog','measurement-dialog']);
  const forward = () => {
    if (legacy.has(location.hash.slice(1))) {
      location.replace(new URL(`rock3d/${location.hash}`,location.href).href);
    }
  };
  forward();
  addEventListener('hashchange',forward);
})();
