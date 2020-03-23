export class Region {
  constructor(x1, y1, x2, y2, drawInstruction = () => { }, subRegions = []) {
    this.xMin = Math.min(x1, x2);
    this.yMin = Math.min(y1, y2);
    this.xMax = Math.max(x1, x2);
    this.yMax = Math.max(y1, y2);
    this.drawInstruction = drawInstruction;

    this.dx = 0;
    this.dy = 0;
    this.subRegions = subRegions;
  }

  xMinSetTo(x) {
    this.translate(x - this.xMin, 0);
  }

  xMidSetTo(x) {
    this.translate(x - this.xMid, 0);
  }

  xMaxSetTo(x) {
    this.translate(x - this.xMax, 0);
  }

  yMinSetTo(y) {
    this.translate(0, y - this.yMin);
  }

  yMidSetTo(y) {
    this.translate(0, y - this.yMid);
  }

  yMaxSetTo(y) {
    this.translate(0, y - this.yMax);
  }

  translate(dx, dy, realTranslate = true) {
    this.xMin += dx;
    this.xMax += dx;
    this.yMin += dy;
    this.yMax += dy;

    if (realTranslate) {
      this.dx += dx;
      this.dy += dy;
    }

    for (let i = 0; i < this.subRegions.length; i++) {
      this.subRegions[i].translate(dx, dy, true);
    }
  }

  get width() {
    return this.xMax - this.xMin;
  }

  get height() {
    return this.yMax - this.yMin;
  }

  get xMid() {
    return this.xMin + this.width / 2;
  }

  get yMid() {
    return this.yMin + this.height / 2;
  }

  combine(otherRegion) {
    const instance = this;
    return new Region(Math.min(this.xMin, otherRegion.xMin), Math.min(this.yMin, otherRegion.yMin), Math.max(this.xMax, otherRegion.xMax), Math.max(this.yMax, otherRegion.yMax), () => { }, [instance, otherRegion]);
  }
}
