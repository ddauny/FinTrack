export function pearsonCorrelation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length === 0) return 0;
  const mx = xs.reduce((a,b) => a+b, 0) / xs.length;
  const my = ys.reduce((a,b) => a+b, 0) / ys.length;
  let sx = 0, sy = 0, sxy = 0;
  for (let i = 0; i < xs.length; i++) {
    const rx = xs[i] - mx;
    const ry = ys[i] - my;
    sx += rx * rx;
    sy += ry * ry;
    sxy += rx * ry;
  }
  if (sx === 0 || sy === 0) return 0;
  return sxy / Math.sqrt(sx * sy);
}
