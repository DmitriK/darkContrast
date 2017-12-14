const requestStdColors = (e: MessageEvent) => {
  if (e.data === '_tcfdt_subdoc_std') {
    browser.runtime.sendMessage({request: 'stdFg'});
    (window as any).tcfdtFrameFixed = true;
  }
  e.stopPropagation();
  // No need to listen to more messages if we have fixed ourselves
  window.removeEventListener('message', requestStdColors, {capture: true});
};

if (window.self !== window.top) {
  window.addEventListener('message', requestStdColors, {capture: true});
}
