import { createElement, render, createContext } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useContext, useProvider, useState } from 'preact/hooks';

/** @jsx createElement */

describe('useContext', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('provides context values', () => {
		const Context = createContext(13);

		const App = () => {
			useProvider(Context, 20);
			return <Comp />;
		};

		const Comp = () => {
			const value = useContext(Context);
			return <p>{value}</p>;
		};

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<p>20</p>');
	});

	it('propagates value updates', () => {
		const Context = createContext(13);
		let set;
		const App = () => {
			const [state, setSate] = useState(20);
			set = setSate;
			useProvider(Context, state);
			return <Comp />;
		};

		const Comp = () => {
			const value = useContext(Context);
			return <p>{value}</p>;
		};

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<p>20</p>');

		set(40);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>40</p>');
	});
});
