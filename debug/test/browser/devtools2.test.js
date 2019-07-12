import { setupScratch, teardown } from '../../../test/_util/helpers';
import { render, h } from 'preact';
import { createMockDevtoolsHook, convertEmit } from './mock-hook';
import { initDevTools } from '../../src/devtools';

/** @jsx h */

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {import('../../src/internal').DevtoolsMock} */
	let mock;

	beforeEach(() => {
		scratch = setupScratch();
		mock = createMockDevtoolsHook();

		/** @type {import('../../src/internal').DevtoolsWindow} */
		(window).__REACT_DEVTOOLS_GLOBAL_HOOK__ = mock.hook;

		initDevTools();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it.skip('should not sent events before marked as connected', () => {
		// TODO
	});

	it('should mount a functional component', () => {
		mock.connect();

		function App() {
			return <h1>Hello World</h1>;
		}

		render(<App />, scratch);
		expect(mock.hook.emit).to.be.calledOnce;
		expect(convertEmit(mock.hook.emit.args[0])).to.deep.equal([
			1,
			1,
			1,
			1,
			10,
			1,
			0, // TODO
			1,
			2,
			4,
			1,
			0,
			4,
			65,
			112,
			112,
			0
		]);
	});
});
