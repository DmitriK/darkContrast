if (window.self !== window.top) {
  window.addEventListener('message', (e) => {
    if (e.data === '_tcfdt_subdoc_std') {
      browser.runtime.sendMessage({request: 'stdFg'});
      (window as any).tcfdtFrameFixed = true;
    }
    e.stopPropagation();
  }, true);
}
