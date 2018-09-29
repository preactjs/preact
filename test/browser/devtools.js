import { createElement as h } from '../../src/create-element';
import { Component } from '../../src/component';
import { getDisplayName, setIn } from '../../src/devtools/custom';
import { setupScratch, teardown } from '../_util/helpers';

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

	describe('getDisplayName', () => {
		it('should get dom name', () => {
			expect(getDisplayName(h('div'))).to.equal('div');
		});

		it('should get Functional Component name', () => {
			function Foo() {
				return <div />;
			}

			expect(getDisplayName(h(Foo))).to.equal('Foo');
		});

		it('should get class name', () => {
			class Bar extends Component {
				render() {
					return <div />;
				}
			}

			expect(getDisplayName(h(Bar))).to.equal('Bar');
		});
	});

	describe('setIn', () => {
		it('should set top property', () => {
			let obj = {};
			setIn(obj, ['foo'], 'bar');
			expect(obj).to.deep.equal({ foo: 'bar' });
		});

		it('should set deep property', () => {
			let obj2 = { foo: { bar: [{ baz: 1 }] } };
			setIn(obj2, ['foo', 'bar', 0, 'baz'], 2);
			expect(obj2).to.deep.equal({ foo: { bar: [{ baz: 2 }] } });
		});

		it('should overwrite property', () => {
			let obj = { foo: 'foo' };
			setIn(obj, ['foo'], 'bar');
			expect(obj).to.deep.equal({ foo: 'bar' });
		});

		it('should set array property', () => {
			let obj = { foo: ['foo'] };
			setIn(obj, ['foo', 0], 'bar');
			expect(obj).to.deep.equal({ foo: ['bar'] });
		});
	});
});
