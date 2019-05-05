/*eslint-env browser, mocha */
/** @jsx h */
import { setupRerender } from 'preact/test-utils';
import { createElement as h, render, Component, Suspense, lazy, Fragment } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';

class LazyComp extends Component {
	render() {
		return <div>Hello from LazyComp</div>;
	}
}

function CustomSuspense({ isDone, start, name }) {
	if (!isDone()) {
		throw start();
	}

	return (
		<div>
			Hello from CustomSuspense {name}
		</div>
	);
}

class Catcher extends Component {
	constructor(props) {
		super(props);
		this.state = { error: false };
	}

	componentDidCatch(e) {
		this.setState({ error: e });
	}

	render(props, state) {
		return state.error ? <div>Catcher did catch: {state.error.message}</div> : props.children;
	}
}

function createSuspension(name, timeout, t) {
	let done = false;
	let prom;

	return {
		name,
		start: () => {
			if (!prom) {
				prom = new Promise((res, rej) => {
					setTimeout(() => {
						done = true;
						if (t) {
							rej(t);
						}
						else {
							res();
						}
					}, timeout);
				});
			}

			return prom;
		},
		getPromise: () => prom,
		isDone: () => done
	};
}

class ClassWrapper extends Component {
	render(props) {
		return (
			<div id="class-wrapper">
				{props.children}
			</div>
		);
	}
}

function FuncWrapper(props) {
	return (
		<div id="func-wrapper">
			{props.children}
		</div>
	);
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
		let prom;

		const Lazy = lazy(() => {
			prom = new Promise((res) => {
				setTimeout(() => {
					res({ default: LazyComp });
				}, 0);
			});

			return prom;
		});

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Lazy />
			</Suspense>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return prom.then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello from LazyComp</div>`
			);
		});
	});

	it('should suspend when a promise is throw', () => {
		const s = createSuspension('regular case', 0, null);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<ClassWrapper>
					<FuncWrapper>
						<CustomSuspense {...s} />
					</FuncWrapper>
				</ClassWrapper>
			</Suspense>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return s.getPromise().then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div id="class-wrapper"><div id="func-wrapper"><div>Hello from CustomSuspense regular case</div></div></div>`
			);
		});
	});

	it('should suspend with custom error boundary', () => {
		const s = createSuspension('within error boundary', 0, null);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<CustomSuspense {...s} />
				</Catcher>
			</Suspense>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return s.getPromise().then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello from CustomSuspense within error boundary</div>`
			);
		});
	});

	it('should support throwing suspense', () => {
		const s = createSuspension('throwing', 0, new Error('Thrown in suspense'));

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<CustomSuspense {...s} />
				</Catcher>
			</Suspense>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return s.getPromise().catch(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello from CustomSuspense throwing</div>`
			);
		});
	});

	it('should call multiple suspending components render in one go', () => {
		const s1 = createSuspension('first', 0, null);
		const s2 = createSuspension('second', 0, null);
		const LoggedCustomSuspense = sinon.spy(CustomSuspense);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					{/* Adding a <div> here will make things work... */}
					<LoggedCustomSuspense {...s1} />
					<LoggedCustomSuspense {...s2} />
				</Catcher>
			</Suspense>
			,
			scratch,
		);
		expect(LoggedCustomSuspense).to.have.been.calledTwice;
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return s1.getPromise().then(s2.getPromise).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello from CustomSuspense first</div><div>Hello from CustomSuspense second</div>`
			);
		});
	});

	it('should call multiple nested suspending components render in one go', () => {
		const s1 = createSuspension('first', 5, null);
		const s2 = createSuspension('second', 5, null);
		const LoggedCustomSuspense = sinon.spy(CustomSuspense);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					{/* Adding a <div> here will make things work... */}
					<LoggedCustomSuspense {...s1} />
					<div>
						<LoggedCustomSuspense {...s2} />
					</div>
				</Catcher>
			</Suspense>
			,
			scratch,
		);
		expect(LoggedCustomSuspense).to.have.been.calledTwice;
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return s1.getPromise().then(s2.getPromise).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello from CustomSuspense first</div><div><div>Hello from CustomSuspense second</div></div>`
			);
		});
	});

	it('should support suspension nested in a Fragment', () => {
		const s = createSuspension('nested in a Fragment', 0, null);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<Fragment>
						<CustomSuspense {...s} />
					</Fragment>
				</Catcher>
			</Suspense>
			,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return s.getPromise().then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Hello from CustomSuspense nested in a Fragment</div>`
			);
		});
	});

	it('should only suspend the most inner Suspend', () => {
		const s = createSuspension('1', 0, null);

		render(
			<Suspense fallback={<div>Suspended... 1</div>}>
				Not suspended...
				<Suspense fallback={<div>Suspended... 2</div>}>
					<Catcher>
						<CustomSuspense {...s} />
					</Catcher>
				</Suspense>
			</Suspense>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`Not suspended...<div>Suspended... 2</div>`
		);

		return s.getPromise().then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`Not suspended...<div>Hello from CustomSuspense 1</div>`
			);
		});
	});

	it('should throw when missing Suspense', () => {
		const s = createSuspension('1', 0, null);

		render(
			<Catcher>
				<CustomSuspense {...s} />
			</Catcher>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Catcher did catch: Missing Suspense</div>`
		);
	});

	it('should throw when lazy\'s loader throws', () => {
		let prom;

		const ThrowingLazy = lazy(() => {
			prom = new Promise((res, rej) => {
				setTimeout(() => {
					rej(new Error('Thrown in lazy\'s loader...'));
				}, 0);
			});
			return prom;
		});

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<ThrowingLazy />
				</Catcher>
			</Suspense>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return prom.catch(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Catcher did catch: Thrown in lazy's loader...</div>`
			);
		});
	});
});
