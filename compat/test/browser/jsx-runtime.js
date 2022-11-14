import { Component } from 'preact/compat';
import { jsx } from 'preact/compat/jsx-runtime';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { getSymbol } from './testUtils';

describe('compat createElement()', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should normalize vnodes', () => {
		let vnode = jsx('div', {
			a: 'b',
			children: jsx('a', { children: 't' })
		});

		const $$typeof = getSymbol('react.element', 0xeac7);
		expect(vnode).to.have.property('$$typeof', $$typeof);
		expect(vnode).to.have.property('type', 'div');
		expect(vnode)
			.to.have.property('props')
			.that.is.an('object');
		expect(vnode.props).to.have.property('children');
		expect(vnode.props.children).to.have.property('$$typeof', $$typeof);
		expect(vnode.props.children).to.have.property('type', 'a');
		expect(vnode.props.children)
			.to.have.property('props')
			.that.is.an('object');
		expect(vnode.props.children.props).to.eql({ children: 't' });
	});

	it('should apply defaultProps', () => {
		class Foo extends Component {
			render() {
				return jsx('div', {});
			}
		}

		Foo.defaultProps = {
			foo: 'bar'
		};

		const vnode = jsx(Foo, {});
		expect(vnode.props).to.deep.equal({
			foo: 'bar'
		});
	});

	it('should keep props over defaultProps', () => {
		class Foo extends Component {
			render() {
				return jsx('div', {});
			}
		}

		Foo.defaultProps = {
			foo: 'bar'
		};

		const vnode = jsx(Foo, { foo: 'baz' });
		expect(vnode.props).to.deep.equal({
			foo: 'baz'
		});
	});
});
