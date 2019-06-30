import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { h } from 'preact';
import { getType, prettify } from '../../../src/devtools/pretty';

/** @jsx h */

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('getType', () => {
		it('should get the type of a value', () => {
			expect(getType('foo')).to.equal('string');
			expect(getType('')).to.equal('string');
			expect(getType(0)).to.equal('number');
			expect(getType(-10)).to.equal('number');
			expect(getType(200)).to.equal('number');
			expect(getType(() => null)).to.equal('function');
			expect(getType(true)).to.equal('boolean');
			expect(getType(null)).to.equal(null);
			expect(getType({})).to.equal('object');
			expect(getType(new Date())).to.equal('date');
			expect(getType(<div />)).to.equal('vnode');
			expect(getType(undefined)).to.equal(null);
			expect(getType(document.createElement('div'))).to.equal('html');
			expect(getType([])).to.equal('array');
			expect(getType(new Set())).to.equal('set');
			expect(getType(new Map())).to.equal('map');
		});
	});

	describe('prettify', () => {
		it('should leave string unchanged if below limit', () => {
			expect(prettify('foo bar', [], [], 0)).to.equal('foo bar');
		});

		it('should limit long strings', () => {
			// Generate a long string
			let x = '1234567890';
			for (let i = 0; i < 4; i++) {
				x += x+x;
			}
			let cleaned = [];
			let res = prettify(x, cleaned, ['foo'], 0);
			expect(res.length).to.equal(500 + 3);
			expect(res.slice(-3)).to.equal('...');
			expect(cleaned).to.deep.equal([]);
		});

		it('should clean functions', () => {
			let cleaned = [];
			let foo = () => null;
			expect(prettify(foo, cleaned, ['foo'], 0)).to.deep.equal({
				name: 'foo',
				type: 'function'
			});
			expect(cleaned).to.deep.equal([['foo']]);
		});

		it('should clean Date objects', () => {
			let cleaned = [];
			let date = new Date();
			expect(prettify(date, cleaned, ['foo'], 0)).to.deep.equal({
				inspectable: false,
				name: date.toString(),
				type: 'date'
			});
			expect(cleaned).to.deep.equal([['foo']]);
		});

		it('should clean vnodes', () => {
			let cleaned = [];
			expect(prettify(<div />, cleaned, ['foo'], 0)).to.deep.equal({
				inspectable: false,
				name: 'div',
				type: 'react_element'
			});
			expect(cleaned).to.deep.equal([['foo']]);
		});

		it('should inspect Symbols', () => {
			let s = Symbol.for('foo');
			expect(prettify(s, [], [], 0)).to.deep.equal({
				inspectable: false,
				name: 'Symbol(foo)',
				type: 'symbol'
			});
		});

		it('should prettify objects', () => {
			expect(prettify({ foo: 1, bar: 'baz' }, [], [], 0)).to.deep.equal({
				foo: 1,
				bar: 'baz'
			});
		});

		it('should prettify objects recursively', () => {
			expect(prettify({ foo: { bar: 1 } }, [], [], 0)).to.deep.equal({
				foo: { bar: 1 }
			});
		});

		it('should limit object recursion', () => {
			let cleaned = [];
			expect(prettify({ foo: { bar: 1 } }, cleaned, ['foo'], 7)).to.deep.equal({
				inspectable: true,
				name: 'Object',
				type: 'object'
			});
			expect(cleaned).to.deep.equal([['foo']]);
		});

		it('should prettify arrays', () => {
			expect(prettify([[1, 2], 3, 4], [], ['foo'], 0)).to.deep.equal([
				[1, 2],
				3,
				4
			]);
		});

		it('should limit array recursion', () => {
			let cleaned = [];
			expect(prettify([[1, 2], 3, 4], cleaned, ['foo'], 7)).to.deep.equal({
				inspectable: true,
				name: 'Array',
				size: 3,
				readonly: false,
				type: 'array'
			});
			expect(cleaned).to.deep.equal([['foo']]);
		});

		it('should prettify Sets', () => {
			let cleaned = [];
			let set = new Set([1,2]);
			expect(prettify(set, cleaned, ['foo'], 0)).to.deep.equal(set);
			expect(cleaned).to.deep.equal([]);
		});

		it('should prettify Maps', () => {
			let cleaned = [];
			let map = new Map([[1, 2]]);
			expect(prettify(map, cleaned, ['foo'], 0)).to.deep.equal(map);
			expect(cleaned).to.deep.equal([]);
		});
	});
});
