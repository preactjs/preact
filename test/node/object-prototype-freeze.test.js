import { expect } from 'chai';
import { createElement } from '../../src/index';
import { cloneVNode } from '../../src/util';

// Under Hardened JavaScript (https://hardenedjs.org/),
// `Object.prototype.constructor` is non-writable. Freezing `Object.prototype`
// outright is the narrowest reproduction of that failure mode. We freeze
// AFTER importing so module init can still complete; the freeze is one-way
// per realm, so this file lives in `test/node/` where each test file runs in
// an isolated worker.
describe('Object.freeze(Object.prototype) compatibility', () => {
	beforeAll(() => {
		Object.freeze(Object.prototype);
	});

	it('Object.prototype is frozen and its constructor is non-writable', () => {
		expect(Object.isFrozen(Object.prototype)).to.equal(true);
		expect(
			Object.getOwnPropertyDescriptor(Object.prototype, 'constructor').writable
		).to.equal(false);
	});

	// The original failure: vnodes have `constructor: undefined` as an own
	// property (JSON-injection guard, see createVNode), and a bare
	// `Object.assign({}, vnode)` walks up to the now-frozen
	// `Object.prototype.constructor` and throws.
	it('Object.assign({}, vnode) throws under frozen Object.prototype', () => {
		const vnode = createElement('div', null, 'x');
		expect(() => Object.assign({}, vnode)).to.throw(TypeError, /constructor/);
	});

	it('cloneVNode copies a vnode under frozen Object.prototype', () => {
		const vnode = createElement('div', { id: 'x' }, 'hi');
		let copy;
		expect(() => {
			copy = cloneVNode(vnode);
		}).not.to.throw();

		expect(copy).to.not.equal(vnode);
		expect(copy.type).to.equal('div');
		expect(copy.props).to.equal(vnode.props);
		expect(copy.key).to.equal(vnode.key);
		expect(copy.ref).to.equal(vnode.ref);
		// constructor sentinel is preserved so isValidElement still recognizes
		// the copy as a vnode.
		expect(Object.prototype.hasOwnProperty.call(copy, 'constructor')).to.equal(
			true
		);
		expect(copy.constructor).to.equal(undefined);
	});

	it('cloneVNode preserves all enumerable own properties of the source', () => {
		const vnode = createElement('span', null, 'x');
		const copy = cloneVNode(vnode);
		for (const k of Object.keys(vnode)) {
			expect(copy[k], k).to.equal(vnode[k]);
		}
	});
});
