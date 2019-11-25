import { createElement, Component, createContext, render } from 'preact';
import { expect } from 'chai';
import { cleanContext, jsonify } from '../../../src/devtools/10/utils';
import { setupScratch, teardown } from '../../../../test/_util/helpers';

/** @jsx createElement */

describe('cleanContext', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should remove createContext items', () => {
		class LegacyProvider extends Component {
			getChildContext() {
				return { foo: 1 };
			}

			render() {
				return this.props.children;
			}
		}

		let contextValue;
		function Child(props, context) {
			contextValue = context;
			return <div>child</div>;
		}

		const ctx = createContext(null);
		render(
			<LegacyProvider>
				<ctx.Provider value="a">
					<ctx.Consumer>{() => <Child />}</ctx.Consumer>
				</ctx.Provider>
			</LegacyProvider>,
			scratch
		);

		expect(cleanContext(contextValue)).to.deep.equal({
			foo: 1
		});
	});

	it('should return null when no context value is present', () => {
		expect(cleanContext({})).to.equal(null);
	});
});

const noop = () => null;

describe('jsonify', () => {
	it('should serialize arrays', () => {
		expect(jsonify([1, 2, 3], noop)).to.deep.equal([1, 2, 3]);
	});

	it('should serialize strings', () => {
		expect(jsonify('foobar', noop)).to.equal('foobar');
	});

	it('should cut off long strings', () => {
		const str = 'foobar'.repeat(100);
		expect(jsonify(str, noop)).to.equal(str.slice(300));
	});

	it('should serialize functions', () => {
		expect(jsonify(noop, noop)).to.deep.equal({
			name: 'noop',
			type: 'function'
		});
	});

	it('should serialize Components', () => {
		function Foo() {}
		Foo.displayName = 'foo';
		expect(jsonify(Foo, noop)).to.deep.equal({
			name: 'foo',
			type: 'function'
		});
	});

	it('should serialize function with name', () => {
		function Foo() {}
		expect(jsonify(Foo, noop)).to.deep.equal({
			name: 'Foo',
			type: 'function'
		});
	});

	it('should work with cyclic structures', () => {
		const foo = { foo: 123 };
		foo.bar = foo;
		expect(jsonify(foo, noop)).to.deep.equal({
			foo: 123,
			bar: '...'
		});
	});
});
