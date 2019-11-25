import { createElement, Component, createContext, render } from 'preact';
import { expect } from 'chai';
import { cleanContext } from '../../../src/devtools/10/utils';
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
