export default class Position {
  public static normalizeYPositions = (positions: Array<{ x: number; y: number }>) => {
    const sum = positions.reduce<Record<number, number>>((sum, { y }) => ({ ...sum, [y]: (sum[y] || 0) + 1 }), {});

    Object.keys(sum)
      .map((y) => +y)
      .forEach((currentY, index, array) => {
        const otherY = array.find((otherY) => [currentY - 1, currentY + 1].includes(otherY) && !!sum[otherY]);
        if (otherY !== undefined) {
          const key = sum[currentY] > sum[otherY] ? otherY : currentY;
          delete sum[key];
        }
      });

    return Object.keys(sum).map((y) => +y);
  };

  public static findClosest = (numbers: number[], needle: number) => {
    return numbers.reduce((a, b) => {
      return Math.abs(b - needle) < Math.abs(a - needle) ? b : a;
    });
  };
}
