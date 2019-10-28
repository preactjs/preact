import { WeakestOfMaps } from '../../src/weakestOfMaps';

describe('WeakestOfMaps', () => {
	const invalidKeys = [1, false, true, undefined, null, 'a', NaN];
	if (typeof Symbol === 'function') {
		invalidKeys.push(Symbol());
	}

	describe('set', () => {
		it('adds entries to weakmap', () => {
			const key1 = {};
			const key2 = [];
			const map = new WeakestOfMaps();

			map.set(key1, 1);
			expect(map.has(key1)).to.be.true;
			expect(map.get(key1)).to.equal(1);

			map.set(key2, 2);
			expect(map.has(key2)).to.be.true;
			expect(map.get(key2)).to.equal(2);
		});

		it('throws if key is not an object', () => {
			const map = new WeakestOfMaps();
			for (const invalidKey of invalidKeys) {
				expect(() => map.set(invalidKey, 1)).to.throw();
			}
		});

		it('returns `this`', () => {
			const map = new WeakestOfMaps();
			expect(map.set({}, 1)).to.equal(map);
		});

		it('returns `this` when setting an existing element', () => {
			const map = new WeakestOfMaps();
			expect(map.set({}, 1)).to.equal(map);
			expect(map.set({}, 2)).to.equal(map);
		});

		it('overrides existing values', () => {
			const map = new WeakestOfMaps();
			const key = {};

			map.set(key, 1);
			expect(map.get(key)).to.equal(1);

			map.set(key, 2);
			expect(map.get(key)).to.equal(2);
		});
	});

	describe('get', () => {
		it('returns value', () => {
			const key1 = {};
			const key2 = [];
			const map = new WeakestOfMaps();

			map.set(key1, 1);
			map.set(key2, 2);

			expect(map.get(key1)).to.equal(1);
			expect(map.get(key2)).to.equal(2);
		});

		it('returns undefined if key is not in weakmap', () => {
			const key = {};
			const map = new WeakestOfMaps();
			expect(map.get(key)).to.equal(undefined);
		});

		it('returns undefined if key was deleted', () => {
			const key = {};
			const map = new WeakestOfMaps();

			map.set(key, 1);
			map.set({}, 2);
			map.delete(key);
			map.set({}, 3);

			expect(map.get(key)).to.equal(undefined);
		});

		it('returns undefined if key is not an object', () => {
			const map = new WeakestOfMaps();
			for (const invalidKey of invalidKeys) {
				expect(map.get(invalidKey)).to.equal(undefined);
			}
		});
	});

	describe('has', () => {
		it('returns false if key is not an object', () => {
			const map = new WeakestOfMaps();
			for (const invalidKey of invalidKeys) {
				expect(map.has(invalidKey)).to.be.false;
			}
		});

		it('returns false when key is not present', () => {
			const key1 = {};
			const key2 = [];
			const map = new WeakestOfMaps();

			expect(map.has(key1)).to.be.false;

			map.set(key1, 1);
			expect(map.has(key2)).to.be.false;

			map.delete(key1);
			expect(map.has(key1)).to.be.false;
		});

		it('returns true when key is present', () => {
			const key1 = {};
			const key2 = [];
			const map = new WeakestOfMaps();

			map.set(key1, 1);
			expect(map.has(key1)).to.be.true;

			map.set(key2, 2);
			expect(map.has(key2)).to.be.true;
		});
	});

	describe('delete', () => {
		it('returns false if key is not an object', () => {
			const map = new WeakestOfMaps();
			for (const invalidKey of invalidKeys) {
				expect(map.delete(invalidKey)).to.be.false;
			}
		});

		it('returns false when delete is a no-op', () => {
			const foo = {};
			const bar = {};
			const map = new WeakMap();

			map.set(foo, 42);
			expect(map.delete(bar)).to.be.false;
		});

		it('returns true when an entry was deleted', () => {
			const foo = {};
			const map = new WeakMap();

			map.set(foo, 42);
			const result = map.delete(foo);
			expect(map.has(foo)).to.be.false;
			expect(result).to.be.true;
		});
	});

	describe('length', () => {
		it('always returns 0', () => {
			const map = new WeakestOfMaps();
			expect(map.length).to.equal(0);

			const key = {};
			map.set(key, 1);
			expect(map.length).to.equal(0);

			map.delete(key);
			expect(map.length).to.equal(0);
		});

		it('is not writable or enumerable', () => {
			const properties = Object.getOwnPropertyDescriptor(
				WeakestOfMaps.prototype,
				'length'
			);

			expect(properties.writable).to.be.false;
			expect(properties.enumerable).to.be.false;
			expect(properties.configurable).to.be.true;
		});
	});
});
