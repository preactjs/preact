/*eslint-env browser, mocha */
import { setupRerender } from 'preact/test-utils';
import { expect } from 'chai';
import { createElement as h, render, Component, Suspense, lazy } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';

class LazyComp extends Component {
	render() {
		return <div>Hello Lazy</div>;
	}
}

class CustomSuspense extends Component {
	constructor(props) {
		super(props);
		this.state = { done: false };
	}
	render() {
		if (!this.state.done) {
			throw new Promise((res) => {
				setTimeout(() => {
					this.setState({ done: true });
					res();
				}, 0);
			});
		}

		return (
			<div>
				Hello CustomSuspense
			</div>
		);
	}
}

class Catcher extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	componentDidCatch(e) {
		this.setState({ error: e });
	}

	render() {
		return this.state.error ? (
			<div>
				Catcher did catch: {this.state.error.message}
			</div>
		) : this.props.children;
	}
}

const Lazy = lazy(() => new Promise((res) => {
	setTimeout(() => {
		res({ default: LazyComp });
	}, 0);
}));

/** @jsx h */

describe('suspense', () => {
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should suspend when using lazy', () => {
		render(<Suspense fallback={<div>Suspended...</div>}>
			<Lazy />
		</Suspense>, scratch);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);
	});

	it('should suspend when a promise is throw', () => {
		render(<Suspense fallback={<div>Suspended...</div>}>
			<CustomSuspense />
		</Suspense>, scratch);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);
	});

	it('should suspend with custom error boundary', () => {
		render(<Suspense fallback={<div>Suspended...</div>}>
			<Catcher>
				<CustomSuspense />
			</Catcher>
		</Suspense>, scratch);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);
	});

	it('should only suspend the most inner Suspend', () => {
		render(<Suspense fallback={<div>Suspended... 1</div>}>
			Not suspended...
			<Suspense fallback={<div>Suspended... 2</div>}>
				<Catcher>
					<CustomSuspense />
				</Catcher>
			</Suspense>
		</Suspense>, scratch);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`Not suspended...<div>Suspended... 2</div>`
		);
	});

	it('should throw when missing Suspense', () => {
		render(<Catcher>
			<CustomSuspense />
		</Catcher>, scratch);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Catcher did catch: CustomSuspense suspended while rendering, but no fallback UI was specified.

Add a &lt;Suspense fallback=...&gt; component higher in the tree to provide a loading indicator or placeholder to display.</div>`
		);
	});
});