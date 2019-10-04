export class EquatableSet<T> implements Iterable<T> {
  private readonly equalityComparer: (o1: T, o2: T) => boolean;
  private readonly collection: T[];

  public constructor(equalityComparer: (o1: T, o2: T) => boolean) {
    this.equalityComparer = equalityComparer;
    this.collection = [];
  }

  public get size(): number {
    return this.collection.length;
  }

  public has(obj: T): boolean {
    return this.hasInternal(obj) >= 0;
  }

  public add(...objs: T[]): void {
    for (const obj of objs) this.addInternal(obj);
  }

  private addInternal(obj: T): void {
    const idx = this.hasInternal(obj);
    if (idx < 0) this.collection.push(obj);
  }

  private hasInternal(obj: T): number {
    for (let i = 0; i < this.collection.length; i++) {
      const other = this.collection[i];
      if (other === obj || this.equalityComparer(other, obj)) return i;
    }

    return -1;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.collection[Symbol.iterator]();
  }
}
