import { EquatableSet } from '../src/utils';

const assert = require('assert');

describe('EquatableSet', () => {
  interface Person {
    name: string;
    age: number;
  }

  it('equals all the properties of an object', () => {
    const set = new EquatableSet((o1: Person, o2: Person) => {
      return o1.name === o2.name && o1.age === o2.age;
    });

    const p1 = { name: 'John', age: 21 };
    const p2 = { name: 'John', age: 25 };
    const p3 = { name: 'John', age: 25 };
    const p4 = { name: 'Jane', age: 26 };
    const p5 = { name: 'Kevin', age: 29 };

    set.add(p1, p2, p3, p4);

    assert.strictEqual(set.size, 3);
    assert.strictEqual(set.has(p1), true);
    assert.strictEqual(set.has(p2), true);
    assert.strictEqual(set.has(p3), true);
    assert.strictEqual(set.has(p5), false);
  });

  it('equals a few properties of an object', () => {
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

    assert.strictEqual(set.size, 2);
    assert.strictEqual(set.has(p1), true);
    assert.strictEqual(set.has(p2), true);
    assert.strictEqual(set.has(p3), true);
    assert.strictEqual(set.has(p4), false);
  });

  it('iterable', () => {
    const set = new EquatableSet((o1: number, o2: number) => {
      return o1 === o2;
    });

    set.add(1, 3, 2, 1, 2, 3, 3, 2, 3, 1, 2, 3, 2);

    const iterated = [...set];
    assert.strictEqual(iterated.length, 3);
  });
});
