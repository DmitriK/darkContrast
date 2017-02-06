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

function colorstyle_to_rgb(s) {
  var color = {};
  if (s === 'transparent') {
    color.r = 0;
    color.g = 0;
    color.b = 0;
    color.a = 0;
    return color;
  }
  var parts = s.split(',', 3);
  color.r = parseInt(parts[0].substr(parts[0].indexOf('(', 3) + 1));
  color.g = parseInt(parts[1].trim());
  color.b = parseInt(parts[2].trim());
  color.a = 1;
  return color;
}

function getIntensityWCAG(srgb) {
  let rgbNormalized = [srgb.r / 255.0, srgb.g / 255.0, srgb.b / 255.0]
  let rgbLin = rgbNormalized.map(function(v) {
    if (v <= 0.03928) {
      return v / 12.92
    } else {
      return Math.pow((v + 0.055) / 1.055, 2.4)
    }
  });

  return 0.2126 * rgbLin[0] + 0.7152 * rgbLin[1] + 0.0722 * rgbLin[2];
}

function is_light(rgb) {
  return getIntensityWCAG(rgb) > 0.5;
}

window.addEventListener('load', function () {
  let defaultFg = getDefaultComputedStyle(document.documentElement).color;

  if (is_light(colorstyle_to_rgb(defaultFg))) {
    // Default foreground color is light, so user most likely has 'Use system
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
