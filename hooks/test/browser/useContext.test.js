import { h, render, createContext } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useContext } from '../../src';

/** @jsx h */


describe('useContext', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});


	it('gets values from context', () => {
		const values = [];
		const Context = createContext(13);

		function Comp() {
			const value = useContext(Context);
			values.push(value);
			return null;
		}

		render(<Comp />, scratch);
		render(<Context.Provider value={42}><Comp /></Context.Provider>, scratch);
		render(<Context.Provider value={69}><Comp /></Context.Provider>, scratch);

		expect(values).to.deep.equal([13, 42, 69]);
	});

});
