/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* exported color */
'use strict';

var color = {
  get_intensity: function (srgb) {
    let rgbNormalized = [srgb.r / 255.0, srgb.g / 255.0, srgb.b / 255.0];
    let rgbLin = rgbNormalized.map(function (v) {
      if (v <= 0.03928) {
        return v / 12.92;
      } else {
        return Math.pow((v + 0.055) / 1.055, 2.4);
      }
    });

    return 0.2126 * rgbLin[0] + 0.7152 * rgbLin[1] + 0.0722 * rgbLin[2];
  },

  is_contrasty: function(fg, bg) {
    let lumF = this.get_intensity(fg);
    let lumB = this.get_intensity(bg);

    let L1 = Math.max(lumF, lumB);
    let L2 = Math.min(lumF, lumB);

    return (L1 + 0.05) / (L2 + 0.05) > 7;
  },

  is_transparent: function(rgb) {
    return rgb.a === 0;
  },

  to_rgb: function (s) {
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
};
