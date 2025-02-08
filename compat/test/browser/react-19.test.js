import React, {
	forwardRef,
	createElement,
	render,
	createRef
} from '../../react-19.mjs';

import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('react-19', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should forward refs by default', () => {
		const ref = createRef();
		const Component = props => {
			props.ref.current = 'foo';
			return <div>Hello</div>;
		};
		const App = () => <Component ref={ref} />;
		render(<App />, scratch);
		expect(ref.current).to.equal('foo');
	});

	it('should forward refs with forwardRef', () => {
		const ref = createRef();
		const Component = forwardRef((props, ref) => {
			ref.current = 'foo';
			return <div>Hello</div>;
		});
		const App = () => <Component ref={ref} />;
		render(<App />, scratch);
		expect(ref.current).to.equal('foo');
	});
});
