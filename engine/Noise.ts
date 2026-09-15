
// A simple pseudo-random noise generator for deterministic terrain
export class NoiseGenerator {
  private p: number[] = [];

  constructor(seed: number = 123) {
    for (let i = 0; i < 256; i++) this.p[i] = i;
    
    // Shuffle based on seed
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this.lerp(0, i + 1, this.pseudoRandom(seed + i)));
      [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
    }
    this.p = [...this.p, ...this.p];
  }

  private pseudoRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  private fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private grad(hash: number, x: number, y: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public perlin2d(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);

    const a = this.p[X] + Y;
    const aa = this.p[a];
    const ab = this.p[a + 1];
    const b = this.p[X + 1] + Y;
    const ba = this.p[b];
    const bb = this.p[b + 1];

    return this.lerp(
      this.lerp(this.grad(this.p[aa], x, y), this.grad(this.p[ba], x - 1, y), u),
      this.lerp(this.grad(this.p[ab], x, y - 1), this.grad(this.p[bb], x - 1, y - 1), u),
      v
    );
  }
}
