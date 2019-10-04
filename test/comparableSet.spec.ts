import { ComparableSet } from '../src/server/state';

const assert = require('assert');

describe('ComparableSet', () => {
  interface Person {
    name: string;
    age: number;
  }

  it('equals all properties of object', () => {
    const set = new ComparableSet((o1: Person, o2: Person) => {
      return o1.name === o2.name && o1.age === o2.age;
    });

    const p1 = { name: 'John', age: 21 };
    const p2 = { name: 'John', age: 25 };
    const p3 = { name: 'Jane', age: 26 };

    set.add(p1);
    set.add(p2);
    set.add(p3);

    assert.strictEqual(set.length, 3);
    assert.strictEqual(set.enumerator[0], p1);
    assert.strictEqual(set.enumerator[1], p2);
    assert.strictEqual(set.enumerator[2], p3);
  });

  it('equals a few properties of object', () => {
    const set = new ComparableSet((o1: Person, o2: Person) => {
      return o1.name === o2.name;
    });

    const p1 = { name: 'John', age: 21 };
    const p2 = { name: 'John', age: 25 };
    const p3 = { name: 'Jane', age: 25 };

    set.add(p1);
    set.add(p2);
    set.add(p3);

    assert.strictEqual(set.length, 2);
    assert.strictEqual(set.enumerator[0], p1);
    assert.strictEqual(set.enumerator[1], p3);
  });
});
