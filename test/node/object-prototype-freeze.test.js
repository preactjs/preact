import { expect } from 'chai';
import { createElement } from '../../src/index';
import { cloneVNode } from '../../src/util';

// Under Hardened JavaScript (https://hardenedjs.org/),
// `Object.prototype.constructor` is non-writable as part of
// override-mistake taming. The narrowest reproduction is just freezing
// `Object.prototype` outright — that also makes `constructor` non-writable
// and triggers the same failure mode without pulling any extra runtime
// into devDeps.
//
// Run order matters: we freeze AFTER importing so module init can still
// complete. The freeze is a one-way operation per realm, so this test lives
// in `test/node/` where each test file runs in an isolated worker.
describe('Object.freeze(Object.prototype) compatibility', () => {
	let constructorWasWritable;

	beforeAll(() => {
		constructorWasWritable = Object.getOwnPropertyDescriptor(
			Object.prototype,
			'constructor'
		).writable;
		Object.freeze(Object.prototype);
	});

	it('Object.prototype is frozen and its constructor is non-writable', () => {
		expect(Object.isFrozen(Object.prototype)).to.equal(true);
		expect(
			Object.getOwnPropertyDescriptor(Object.prototype, 'constructor').writable
		).to.equal(false);
		// sanity: the descriptor was writable before we froze it
		expect(constructorWasWritable).to.equal(true);
	});

	// This documents the original failure: vnodes have `constructor: undefined`
	// as an own property (JSON-injection guard, see createVNode), and a bare
	// `Object.assign({}, vnode)` walks up to the now-frozen
	// `Object.prototype.constructor` and throws.
	it('Object.assign({}, vnode) throws under frozen Object.prototype', () => {
		const vnode = createElement('div', null, 'x');
		expect(() => Object.assign({}, vnode)).to.throw(
			TypeError,
			/constructor/
		);
	});

	// This is the path Preact must use everywhere it shallow-copies a vnode.
	// Pre-seeding the target with its own `constructor` slot bypasses the
	// override-mistake walk. `cloneVNode` is the tested helper used by
	// `renderComponent` (component.js) and `cloneNode` (diff/index.js).
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
		expect(
			Object.prototype.hasOwnProperty.call(copy, 'constructor')
		).to.equal(true);
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
