/*eslint-env browser, mocha */
import { setupRerender } from 'preact/test-utils';
import { expect } from 'chai';
import { createElement as h, render, Component, Suspense, lazy } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';

function schedule(cb) {
	setTimeout(cb, 0);
}

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
				schedule(() => {
					this.setState({ done: true });
					res();
				});
			});
		}

		return (
			<div>
				Hello CustomSuspense
			</div>
		);
	}
}

class ThrowingSuspense extends Component {
	constructor(props) {
		super(props);
		this.state = { done: false };
	}
	render() {
		if (!this.state.done) {
			throw new Promise((res, rej) => {
				schedule(() => {
					this.setState({ done: true });
					rej(new Error('I\'m a throwing Suspense!'));
				});
			});
		}

		return (
			<div>
				Hello ThrowingSuspense
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
	schedule(() => {
		res({ default: LazyComp });
	});
}));

const ThrowingLazy = lazy(() => new Promise((res, rej) => {
	schedule(() => {
		rej(new Error('Thrown in lazy\'s loader...'));
	});
}));

class WrapperOne extends Component {
	render() {
		return this.props.children;
	}
}

/** @jsx h */

function tick(fn) {
	return new Promise((res) => {
		setTimeout(res, 10);
	})
		.then(fn);
}

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

		return tick(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello Lazy</div>`
			);
		});
	});

	it('should suspend when a promise is throw', () => {
		render(<Suspense fallback={<div>Suspended...</div>}>
			<WrapperOne>
				<CustomSuspense />
			</WrapperOne>
		</Suspense>, scratch);
		// TODO: why a rerender needed here. Will this even work in the browser?!
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return tick(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello CustomSuspense</div>`
			);
		});
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

		return tick(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello CustomSuspense</div>`
			);
		});
	});

	it('should support throwing suspense', () => {
		render(<Suspense fallback={<div>Suspended...</div>}>
			<Catcher>
				<ThrowingSuspense />
			</Catcher>
		</Suspense>, scratch);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return tick(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello ThrowingSuspense</div>`
			);
		});
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

		return tick(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`Not suspended...<div>Hello CustomSuspense</div>`
			);
		});
	});

	it('should throw when missing Suspense', () => {
		render(<Catcher>
			<CustomSuspense />
		</Catcher>, scratch);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Catcher did catch: Missing Suspense</div>`
		);
	});

	it('should throw when lazy\'s loader throws', () => {
		render(<Suspense fallback={<div>Suspended...</div>}>
			<Catcher>
				<ThrowingLazy />
			</Catcher>
		</Suspense>, scratch);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return tick(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Catcher did catch: Thrown in lazy's loader...</div>`
			);
		});
	});
});