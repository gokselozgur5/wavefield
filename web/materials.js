export const MaterialKind = Object.freeze({
  FreeSpace: 0,
  Drywall: 1,
  Glass: 2,
  Foliage: 3,
  Concrete: 4,
  Metal: 5,
});

export const MATERIAL_SPECS = Object.freeze({
  [MaterialKind.FreeSpace]: { epsR: 1.0, sigma: 0.0, color: [0, 0, 0, 0] },
  [MaterialKind.Drywall]: { epsR: 2.2, sigma: 0.015, color: [220, 200, 170, 220] },
  [MaterialKind.Glass]: { epsR: 6.0, sigma: 0.005, color: [100, 200, 240, 180] },
  [MaterialKind.Foliage]: { epsR: 1.3, sigma: 0.05, color: [40, 160, 60, 200] },
  [MaterialKind.Concrete]: { epsR: 5.5, sigma: 0.12, color: [140, 140, 145, 235] },
  [MaterialKind.Metal]: { epsR: 1.0, sigma: 1.0e7, color: [255, 215, 0, 255] },
});

export function ezToDbm(ezAbs) {
  const s = (ezAbs * ezAbs) / 376.73031346177;
  const pMw = s * 1000.0;
  return pMw <= 1e-15 ? -120.0 : Math.max(-120.0, Math.min(30.0, 10.0 * Math.log10(pMw)));
}

export function turboColormapRgba(val) {
  const t = Math.max(0.0, Math.min(1.0, val));
  let r = 0.0, g = 0.0, b = 0.0;
  if (t < 0.25) {
    g = t * 3.2;
    b = 0.6 + t * 1.6;
  } else if (t < 0.5) {
    r = (t - 0.25) * 0.8;
    g = 0.8 + (t - 0.25) * 0.4;
    b = 1.0 - (t - 0.25) * 4.0;
  } else if (t < 0.75) {
    r = (t - 0.5) * 3.2 + 0.2;
    g = 0.8 + (t - 0.25) * 0.4;
  } else {
    r = 1.0;
    g = Math.max(0.0, 1.0 - (t - 0.75) * 4.0);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255];
}

export function colorizeDbmRgba(dbm, minDbm = -90.0, maxDbm = 10.0) {
  if (maxDbm <= minDbm) return [0, 0, 0, 255];
  return turboColormapRgba((dbm - minDbm) / (maxDbm - minDbm));
}
