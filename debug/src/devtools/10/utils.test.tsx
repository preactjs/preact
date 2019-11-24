import { h, Component, createContext, render } from 'preact';
import { teardown } from 'preact/test-utils';
import { setupScratch } from './renderer.test';
import { expect } from 'chai';
import { cleanContext } from './utils';

describe('cleanContext', () => {
	let scratch: HTMLDivElement;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown();
		scratch.remove();
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

		let contextValue: any;
		function Child(props: any, context: any) {
			contextValue = context;
			return <div>child</div>;
		}

		const ctx = createContext<any>(null);
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
