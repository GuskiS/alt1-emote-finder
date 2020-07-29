import { Rect, RectLike } from "@alt1/base";

export default class ImageDataSet {
  buffers: ImageData[] = [];

  static fromFilmStrip(baseimg: ImageData, width: number) {
    if (baseimg.width % width != 0) {
      throw new Error("slice size does not fit in base img");
    }
  }

  static fromFilmStripUneven(baseimg: ImageData, widths: number[]) {
    let r = new ImageDataSet();
    let x = 0;
    for (let w of widths) {
      r.buffers.push(baseimg.clone(new Rect(x, 0, w, baseimg.height)));
      x += w;
      if (x > baseimg.width) {
        throw new Error("sampling filmstrip outside bounds");
      }
    }

    if (x != baseimg.width) {
      throw new Error("unconsumed pixels left in film strip imagedata");
    }
    return r;
  }

  static fromAtlas(baseimg: ImageData, slices: RectLike[]) {
    let r = new ImageDataSet();
    for (let slice of slices) {
      r.buffers.push(baseimg.clone(slice));
    }
    return r;
  }
}
