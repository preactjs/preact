import { createElement, render, createContext } from 'preact';
import { act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useContextSelector, useState } from 'preact/hooks';

/** @jsx createElement */

describe('useContextSelector', () =>{
		/** @type {HTMLDivElement} */
		let scratch;

		beforeEach(() => {
			scratch = setupScratch();
		});

		afterEach(() => {
			teardown(scratch);
		});

	it('should selectively rerender', () => {
		let appRenders = 0,
			providerRenders = 0,
			layoutRenders = 0,
			consumerFooRenders = 0,
			consumerBarRenders = 0,
			set;
		const context = createContext();

		const MyProvider = ({ children }) => {
			providerRenders++;
			const [state, setState] = useState({ foo: 'hello', bar: 'world' });
			set = setState;
			return <context.Provider value={state}>{children}</context.Provider>;
		};

		const Layout = ({ children }) => {
			layoutRenders++;
			return <div>{children}</div>;
		};

		const Foo = () => {
			consumerFooRenders++;
			const value = useContextSelector(context, v => v.foo);
			return <p>{value}</p>;
		};

		const Bar = () => {
			consumerBarRenders++;
			const value = useContextSelector(context, v => v.bar);
			return <p>{value}</p>;
		};

		const App = () => {
			appRenders++;
			return (
				<MyProvider>
					<Layout>
						<Foo />
						<Bar />
					</Layout>
				</MyProvider>
			);
		};

		render(<App />, scratch);

		expect(scratch.innerHTML).to.equal('<div><p>hello</p><p>world</p></div>');
		expect(appRenders).to.equal(1);
		expect(layoutRenders).to.equal(1);
		expect(providerRenders).to.equal(1);
		expect(consumerFooRenders).to.equal(1);
		expect(consumerBarRenders).to.equal(1);

		act(() => {
			set({ foo: 'hello', bar: 'Earth' });
		});
		expect(scratch.innerHTML).to.equal('<div><p>hello</p><p>Earth</p></div>');
		expect(appRenders).to.equal(1);
		expect(layoutRenders).to.equal(1);
		expect(providerRenders).to.equal(2);
		expect(consumerFooRenders).to.equal(1);
		expect(consumerBarRenders).to.equal(2);

		act(() => {
			set({ foo: 'hi', bar: 'Earth' });
		});
		expect(scratch.innerHTML).to.equal('<div><p>hi</p><p>Earth</p></div>');
		expect(appRenders).to.equal(1);
		expect(layoutRenders).to.equal(1);
		expect(providerRenders).to.equal(3);
		expect(consumerFooRenders).to.equal(2);
		expect(consumerBarRenders).to.equal(2);

		act(() => {
			set({ foo: 'hello', bar: 'world' });
		});
		expect(scratch.innerHTML).to.equal('<div><p>hello</p><p>world</p></div>');
		expect(appRenders).to.equal(1);
		expect(layoutRenders).to.equal(1);
		expect(providerRenders).to.equal(4);
		expect(consumerFooRenders).to.equal(3);
		expect(consumerBarRenders).to.equal(3);
	});
})
