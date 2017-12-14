const requestStdColors = (e: MessageEvent) => {
  if (e.data === '_tcfdt_subdoc_std') {
    e.stopPropagation();

    browser.runtime.sendMessage({request: 'stdFg'});
    (window as any).tcfdtFrameFixed = true;
  }
};

window.addEventListener('message', requestStdColors, {capture: true});
