"use strict";

function sendToggle(tabs) {
  let id = tabs[0].id;
  browser.tabs.sendMessage(id, {request: 'toggle'}).then(m => {
    if (m.toggle) {
      browser.browserAction.setBadgeText({text: "", tabId: id});
    } else {
      browser.browserAction.setBadgeText({text: "off", tabId: id});
    }
  });
}

function togg_std(tabs) {
  let id = tabs[0].id;
  browser.tabs.sendMessage(id, {request: 'std'}).then(m => {
    if (m.std) {
      browser.browserAction.setBadgeText({text: "std", tabId: id});
    } else {
      browser.browserAction.setBadgeText({text: "", tabId: id});
    }
  });
}

function is_light(rgb) {
  return color.get_intensity(rgb) > 0.5;
}

window.addEventListener('load', function () {
  const defaultFg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).color);
  const defaultBg = color.to_rgb(getDefaultComputedStyle(
    document.documentElement).backgroundColor);

  if (!color.is_contrasty(defaultFg, {r: 255, g: 255, b: 255, a: 1}) ||
      !color.is_contrasty({r: 0, g: 0, b: 0, a: 1}, defaultBg)) {
    // Contrast check against what sites will assume to be default
    // (black fg, white bg) failed, so user most likely has 'Use system
    // colors' on
    document.getElementById('tog_std').style.display = 'block';
  }

  document.getElementById('tog_main').addEventListener('click', function() {
    browser.tabs.query({currentWindow: true, active: true}).then(sendToggle);
  });

  document.getElementById('tog_std').addEventListener('click', function() {
    browser.tabs.query({currentWindow: true, active: true}).then(togg_std);
  });
});
