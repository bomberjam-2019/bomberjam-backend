import { EquatableSet } from '../src/utils';

describe('EquatableSet', () => {
  interface Person {
    name: string;
    age: number;
  }

  test('equals all the properties of an object', () => {
    const set = new EquatableSet((o1: Person, o2: Person) => {
      return o1.name === o2.name && o1.age === o2.age;
    });

    const p1 = { name: 'John', age: 21 };
    const p2 = { name: 'John', age: 25 };
    const p3 = { name: 'John', age: 25 };
    const p4 = { name: 'Jane', age: 26 };
    const p5 = { name: 'Kevin', age: 29 };

    set.add(p1, p2, p3, p4);

    expect(set.size).toBe(3);
    expect(set.has(p1)).toBe(true);
    expect(set.has(p2)).toBe(true);
    expect(set.has(p3)).toBe(true);
    expect(set.has(p5)).toBe(false);
  });

  test('equals a few properties of an object', () => {
    const set = new EquatableSet((o1: Person, o2: Person) => {
      return o1.name === o2.name;
    });

    const p1 = { name: 'Mike', age: 21 };
    const p2 = { name: 'Mike', age: 25 };
    const p3 = { name: 'Jane', age: 25 };
    const p4 = { name: 'Michael', age: 31 };

    set.add(p1);
    set.add(p2);
    set.add(p3);

    expect(set.size).toBe(2);
    expect(set.has(p1)).toBe(true);
    expect(set.has(p2)).toBe(true);
    expect(set.has(p3)).toBe(true);
    expect(set.has(p4)).toBe(false);
  });

  test('iterable', () => {
    const set = new EquatableSet((o1: number, o2: number) => {
      return o1 === o2;
    });

    set.add(1, 3, 2, 1, 2, 3, 3, 2, 3, 1, 2, 3, 2);

    const iterated = [...set];
    expect(iterated.length).toBe(3);
  });
});
