/* Copyright (c) 2017 Dmitri Kourennyi */
/* See the file COPYING for copying permission. */
/* exported color */
'use strict';

let constrastRatio = 4.5;

const color = {
  get_intensity(srgb) {
    const rgbNormalized = [srgb.r / 255.0, srgb.g / 255.0, srgb.b / 255.0];
    const rgbLin = rgbNormalized.map((v) => {
      if (v <= 0.03928) {
        return v / 12.92;
      }

      return Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rgbLin[0] + 0.7152 * rgbLin[1] + 0.0722 * rgbLin[2];
  },

  is_contrasty(fg, bg) {
    const lumF = this.get_intensity(fg);
    const lumB = this.get_intensity(bg);

    const L1 = Math.max(lumF, lumB);
    const L2 = Math.min(lumF, lumB);

    return (L1 + 0.05) / (L2 + 0.05) > constrastRatio;
  },

  is_transparent(rgb) {
    return rgb.a === 0;
  },

  setContrastRatio(x) {
    if (x < 1 || x > 21) {
      constrastRatio = 4.5;
    } else {
      constrastRatio = x;
    }
  },

  to_rgb(s) {
    if (s === 'transparent') {
      return {r: 0, g: 0, b: 0, a: 0};
    }

    const rgb = {};
    const parts = s.split(',', 4);

    rgb.r = parseInt(parts[0].substr(parts[0].indexOf('(', 3) + 1), 10);
    rgb.g = parseInt(parts[1].trim(), 10);
    rgb.b = parseInt(parts[2].trim(), 10);
    if (parts[3] == null) {
      rgb.a = 1;
    } else {
      rgb.a = parseInt(parts[3].trim(), 10);
    }

    return rgb;
  },
};
