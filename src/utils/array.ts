export function flatten<T>(array: T[][]): T[] {
  const r: T[] = [];

  array.forEach((x) => {
    x.forEach((y) => {
      r.push(y);
    });
  });

  return r;
}
