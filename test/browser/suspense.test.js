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

function CustomSuspense({ isDone, promise, name }) {
	if (!isDone()) {
		throw promise;
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

function createSuspension(name, error) {
	let done = false;
	let resolve;
	let promise = new Promise((res) => {
		resolve = () => {
			res();
			return promise;
		};
	})
		.then(() => {
			done = true;
		});

	return {
		name,
		promise,
		isDone: () => done,
		resolve
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
		let resolve;

		const Lazy = lazy(() => new Promise((res) => {
			resolve = () => {
				res({ default: LazyComp });
			};
		}));

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Lazy />
			</Suspense>
		);
		render(suspense, scratch);

		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			const p = Promise.all(suspense._component._suspensions)
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>Hello from LazyComp</div>`
					);
				});
			resolve();
			return p;
		});
	});

	it('should suspend when a promise is throw', () => {
		const s = createSuspension('regular case', 0, null);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<ClassWrapper>
					<FuncWrapper>
						<CustomSuspense {...s} />
					</FuncWrapper>
				</ClassWrapper>
			</Suspense>
		);

		render(suspense, scratch);

		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s.resolve().then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div id="class-wrapper"><div id="func-wrapper"><div>Hello from CustomSuspense regular case</div></div></div>`
				);
			});
		});
	});

	it('should suspend with custom error boundary', () => {
		const s = createSuspension('within error boundary', 0, null);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<CustomSuspense {...s} />
				</Catcher>
			</Suspense>
		);

		render(suspense, scratch);

		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s.resolve().then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Hello from CustomSuspense within error boundary</div>`
				);
			});
		});
	});

	it('should support throwing suspense', () => {
		const s = createSuspension('throwing', 0, new Error('Thrown in suspense'));

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<CustomSuspense {...s} />
				</Catcher>
			</Suspense>
		);

		render(suspense, scratch);

		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s.resolve().catch(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Hello from CustomSuspense throwing</div>`
				);
			});
		});
	});

	// TODO: this one is failing. I guess because we just park/re-mount a single node instead of
	// all in the fragment
	it('should call multiple suspending components render in one go', () => {
		const s1 = createSuspension('first', 0, null);
		const s2 = createSuspension('second', 0, null);
		const LoggedCustomSuspense = sinon.spy(CustomSuspense);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					{/* Adding a <div> here will make things work... */}
					<LoggedCustomSuspense {...s1} />
					<LoggedCustomSuspense {...s2} />
				</Catcher>
			</Suspense>
		);
		render(suspense, scratch);
		expect(LoggedCustomSuspense).to.have.been.calledTwice;

		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s1.resolve().then(() => {
				rerender(); // this rerender is not strictly needed as Suspense doesn't wait but
				// it is here to make sure we don't change anything else
				expect(scratch.innerHTML).to.eql(
					`<div>Suspended...</div>`
				);

				return s2.resolve().then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>Hello from CustomSuspense first</div><div>Hello from CustomSuspense second</div>`
					);
				});
			});
		});
	});

	// TODO: This one is failing as we are not properly unmounting dom nodes.
	// we just unmount the first one...
	it('should call multiple nested suspending components render in one go', () => {
		const s1 = createSuspension('first', 5, null);
		const s2 = createSuspension('second', 5, null);
		const LoggedCustomSuspense = sinon.spy(CustomSuspense);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					{/* Adding a <div> here will make things work... */}
					<LoggedCustomSuspense {...s1} />
					<div>
						<LoggedCustomSuspense {...s2} />
					</div>
				</Catcher>
			</Suspense>
		);

		render(suspense, scratch);
		expect(LoggedCustomSuspense).to.have.been.calledTwice;

		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s1.resolve().then(s2.resolve()).then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Hello from CustomSuspense first</div><div><div>Hello from CustomSuspense second</div></div>`
				);
			});
		});
	});

	it('should support suspension nested in a Fragment', () => {
		const s = createSuspension('nested in a Fragment', 0, null);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<Fragment>
						<CustomSuspense {...s} />
					</Fragment>
				</Catcher>
			</Suspense>
		);
		render(suspense, scratch);

		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s.resolve().then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Hello from CustomSuspense nested in a Fragment</div>`
				);
			});
		});
	});

	it('should support multiple non-nested Suspense', () => {
		const s1 = createSuspension('1', 0, null);
		const s2 = createSuspension('2', 0, null);

		const suspense1 = (
			<Suspense fallback={<div>Suspended 1...</div>}>
				<CustomSuspense {...s1} />
			</Suspense>
		);
		const suspense2 = (
			<Suspense fallback={<div>Suspended 2...</div>}>
				<CustomSuspense {...s2} />
			</Suspense>
		);

		render((
			<div>
				<div>{suspense1}</div>
				<div>{suspense2}</div>
			</div>
		), scratch);

		return suspense1._component._p.then(() => suspense2._component._p).then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div><div><div>Suspended 1...</div></div><div><div>Suspended 2...</div></div></div>`
			);

			return s1.resolve().then(s2.resolve()).then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div><div><div>Hello from CustomSuspense 1</div></div><div><div>Hello from CustomSuspense 2</div></div></div>`
				);
			});
		});
	});

	// TODO: this one is failing due to #1605
	it.skip('should support multiple Suspense inside a Fragment', () => {
		const s1 = createSuspension('1', 0, null);
		const s2 = createSuspension('2', 0, null);

		const suspense1 = (
			<Suspense fallback={<div>Suspended 1...</div>}>
				<CustomSuspense {...s1} />
			</Suspense>
		);
		const suspense2 = (
			<Suspense fallback={<div>Suspended 2...</div>}>
				<CustomSuspense {...s2} />
			</Suspense>
		);

		render(
			<div>
				<Fragment>
					{suspense1}
					{suspense2}
				</Fragment>
			</div>
			,
			scratch,
		);

		return suspense1._component._p.then(() => suspense2._component._p).then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div><div>Suspended 1...</div><div>Suspended 2...</div></div>`
			);

			return s1.resolve().then(s2.resolve()).then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div><div>Hello from CustomSuspense 1</div><div>Hello from CustomSuspense 2</div></div>`
				);
			});
		});
	});

	it('should only suspend the most inner Suspend', () => {
		const s = createSuspension('1', 0, null);

		const suspense = (
			<Suspense fallback={<div>Suspended... 2</div>}>
				<Catcher>
					<CustomSuspense {...s} />
				</Catcher>
			</Suspense>
		);

		render((
			<Suspense fallback={<div>Suspended... 1</div>}>
				Not suspended...
				{suspense}
			</Suspense>
		), scratch);

		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`Not suspended...<div>Suspended... 2</div>`
			);

			return s.resolve().then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`Not suspended...<div>Hello from CustomSuspense 1</div>`
				);
			});
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
		let reject;

		const ThrowingLazy = lazy(() => {
			const prom = new Promise((res, rej) => {
				reject = () => {
					rej(new Error('Thrown in lazy\'s loader...'));
					return prom;
				};
			});

			return prom;
		});

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<ThrowingLazy />
				</Catcher>
			</Suspense>
		);
		
		render(suspense, scratch);


		return suspense._component._p.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return reject().catch(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Catcher did catch: Thrown in lazy's loader...</div>`
				);
			});
		});
	});
});
