/*eslint-env browser, mocha */
/** @jsx h */
import { setupRerender } from 'preact/test-utils';
import { createElement as h, render, Component, Suspense, lazy, Fragment } from '../../src/index';
import { setupScratch, teardown, dedent } from '../_util/helpers';

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

function createSuspension(name, timeout, error) {
	let done = false;
	let prom;

	return {
		name,
		start: () => {
			if (!prom) {
				prom = new Promise((res, rej) => {
					setTimeout(() => {
						done = true;
						if (error) {
							rej(error);
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

	xit('should suspend when using lazy', () => {
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

	xit('should suspend when a promise is throw', () => {
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

	xit('should suspend with custom error boundary', () => {
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

	xit('should support throwing suspense', () => {
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

	xit('should call multiple suspending components render in one go', () => {
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

	xit('should call multiple nested suspending components render in one go', () => {
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

	xit('should support suspension nested in a Fragment', () => {
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

	xit('should support multiple non-nested Suspense', () => {
		const s1 = createSuspension('1', 0, null);
		const s2 = createSuspension('2', 0, null);

		render(
			<div>
				<div>
					<Suspense fallback={<div>Suspended 1...</div>}>
						<CustomSuspense {...s1} />
					</Suspense>
				</div>
				<div>
					<Suspense fallback={<div>Suspended 2...</div>}>
						<CustomSuspense {...s2} />
					</Suspense>
				</div>
			</div>
			,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div><div><div>Suspended 1...</div></div><div><div>Suspended 2...</div></div></div>`
		);

		return s1.getPromise().then(s2.getPromise).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div><div><div>Hello from CustomSuspense 1</div></div><div><div>Hello from CustomSuspense 2</div></div></div>`
			);
		});
	});

	it.skip('should support multiple Suspense inside a Fragment', () => {
		const s1 = createSuspension('1', 0, null);
		const s2 = createSuspension('2', 0, null);

		render(
			<div>
				<Fragment>
					<Suspense fallback={<div>Suspended 1...</div>}>
						<CustomSuspense {...s1} />
					</Suspense>
					<Suspense fallback={<div>Suspended 2...</div>}>
						<CustomSuspense {...s2} />
					</Suspense>
				</Fragment>
			</div>
			,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div><div>Suspended 1...</div><div>Suspended 2...</div></div>`
		);

		return s1.getPromise().then(s2.getPromise).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div><div>Hello from CustomSuspense 1</div><div>Hello from CustomSuspense 2</div></div>`
			);
		});
	});

	xit('should only suspend the most inner Suspend', () => {
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

	xit('should throw when missing Suspense', () => {
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

	xit('should throw when lazy\'s loader throws', () => {
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

	it('should keep state when suspending', () => {
		class Suspender extends Component {
			suspend() {
				let resolve;
				this.suspension = new Promise((res) => {
					resolve = () => {
						this.suspension = null;
						res();
					};
				});

				this.forceUpdate();

				return resolve;
			}
			render(props) {
				if (this.suspension) {
					throw this.suspension;
				}

				return (
					<div>
						Hello Suspender {props.id}
						{this.props.children}
					</div>
				);
			}
		}

		class Logger extends Component {
			render() {
				return (
					<div>
						<p>Logger {this.props.id}</p>
						{this.props.children}
					</div>);
			}
		}

		class Stateful extends Component {
			render(props, state) {
				const Tag = state && state.tag || 'div';
				return (
					<Tag>
						<h1>stateful</h1>
						{JSON.stringify(state)}
					</Tag>
				);
			}
		}

		class StatefulWithChildren extends Component {
			render(props) {
				return props.children;
			}
		}

		function WrappedTextNode() {
			return 'wrapped text';
		}

		function WrappedDomNode() {
			return <section id="wrapped" />;
		}

		function dedent(strs) {
			return strs
				.map(str => str
					.split('\n')
					.map(line => line.trim())
					.join(''))
				.join('');
		}

		console.log('initial render ---------------------------------');
		const stateful = <Stateful />;
		const statefulWithChildren = <StatefulWithChildren><div>stateful with children</div></StatefulWithChildren>;
		const suspender1 = (
			<Suspender id="1">
				<Logger id="inner" />
			</Suspender>
		);
		const suspender2 = (
			<Suspender id="2">
				<Logger id="inner2" />
			</Suspender>
		);
		render(
			<Suspense fallback={<div>Suspended...</div>}>
				Test
				<Fragment>
					<Logger id="before" />
				</Fragment>
				<WrappedTextNode />
				<WrappedDomNode />
				<Logger id="outer">
					{suspender1}
					{suspender2}
				</Logger>
				{stateful}
				{statefulWithChildren}
			</Suspense>,
			scratch,
		);
		console.log('initial render done ----------------------------');
		expect(scratch.innerHTML).to.eql(dedent`
			Test
			<div>
				<p>Logger before</p>
			</div>
			wrapped text
			<section id="wrapped" />
			<div>
				<p>Logger outer</p>
				<div>
					Hello Suspender 1
					<div>
						<p>Logger inner</p>
					</div>
				</div>
				<div>
					Hello Suspender 2
					<div>
						<p>Logger inner2</p>
					</div>
				</div>
			</div>
			<div>
				<h1>stateful</h1>{}
			</div>
			<div>stateful with children</div>
		`);
		console.log('------------------------------------------------');

		const resolve = suspender1._component.suspend();
		console.log('render suspended -------------------------------');
		rerender();
		console.log('render suspended done --------------------------');
		console.log(scratch);
		expect(scratch.innerHTML).to.eql(dedent`
			<div style="display: none;">
				<p>Logger before</p>
			</div>
			<section id="wrapped" style="display: none;" />
			<div style="display: none;">
				<p>Logger outer</p>
				<div>
					Hello Suspender 2
					<div>
						<p>Logger inner2</p>
					</div>
				</div>
			</div>
			<div style="display: none;">
				<h1>stateful</h1>{}
			</div>
			<div style="display: none;">stateful with children</div>
			<div>Suspended...</div>
		`);
		console.log('------------------------------------------------');

		stateful._component.setState({ tag: 'article' });
		console.log('render after setState --------------------------');
		rerender();
		console.log('render after setState done ---------------------');
		console.log(scratch);
		// TODO: article is moved to the end because of the ordering issue with Fragments
		expect(scratch.innerHTML).to.eql(dedent`
			<div style="display: none;">
				<p>Logger before</p>
			</div>
			<section id="wrapped" style="display: none;" />
			<div style="display: none;">
				<p>Logger outer</p>
				<div>
					Hello Suspender 2
					<div>
						<p>Logger inner2</p>
					</div>
				</div>
			</div>
			<div style="display: none;">stateful with children</div>
			<div>Suspended...</div>
			<article style="display: none;">
				<h1>stateful</h1>{"tag":"article"}
			</article>
		`);
		console.log('------------------------------------------------');

		statefulWithChildren._component.setState({ foo: 'bar' });
		console.log('render after setState2 -------------------------');
		rerender();
		console.log('render after setState2 done --------------------');
		console.log(scratch);
		expect(scratch.innerHTML).to.eql(dedent`
			<div style="display: none;">
				<p>Logger before</p>
			</div>
			<section id="wrapped" style="display: none;" />
			<div style="display: none;">
				<p>Logger outer</p>
				<div>
					Hello Suspender 2
					<div>
						<p>Logger inner2</p>
					</div>
				</div>
			</div>
			<div style="display: none;">stateful with children</div>
			<div>Suspended...</div>
			<article style="display: none;">
				<h1>stateful</h1>{"tag":"article"}
			</article>
		`);
		console.log('------------------------------------------------');

		const resolve2 = suspender2._component.suspend();
		console.log('render suspended 2 -------------------------');
		rerender();
		console.log('render suspended 2 done --------------------');
		console.log(scratch);
		expect(scratch.innerHTML).to.eql(dedent`
			<div style="display: none;">
				<p>Logger before</p>
			</div>
			<section id="wrapped" style="display: none;" />
			<div style="display: none;">
				<p>Logger outer</p>
			</div>
			<div style="display: none;">stateful with children</div>
			<div>Suspended...</div>
			<article style="display: none;">
				<h1>stateful</h1>{"tag":"article"}
			</article>
		`);
		console.log('------------------------------------------------');

		const final = suspender1._component.suspension.then(() => {
			console.log('render suspension resolved -----------------');
			rerender();
			console.log('render suspension resolved done ------------');
			console.log(scratch);
			// TODO: The text node `Test` is moved to the end because of the ordering issue with Fragments
			expect(scratch.innerHTML).to.eql(dedent`
				<div style="display: none;">
					<p>Logger before</p>
				</div>
				<section id="wrapped" style="display: none;" />
				<div style="display: none;">
					<p>Logger outer</p>
					<div>
						Hello Suspender 1
						<div>
							<p>Logger inner</p>
						</div>
					</div>
				</div>
				<div style="display: none;">stateful with children</div>
				<div>Suspended...</div>
				<article style="display: none;">
					<h1>stateful</h1>{"tag":"article"}
				</article>
			`);
			console.log('--------------------------------------------');

			const final2 = suspender2._component.suspension.then(() => {
				console.log('render suspension resolved -----------------');
				rerender();
				console.log('render suspension resolved done ------------');
				console.log(scratch);
				// TODO: The text nodes `Test` and `wrapped text` are moved to the end because of the ordering issue with Fragments. See #1605
				expect(scratch.innerHTML).to.eql(dedent`
					<div style="">
						<p>Logger before</p>
					</div>
					<section id="wrapped" style="" />
					<div style="">
						<p>Logger outer</p>
						<div>
							Hello Suspender 1
							<div>
								<p>Logger inner</p>
							</div>
						</div>
						<div>
							Hello Suspender 2
							<div>
								<p>Logger inner2</p>
							</div>
						</div>
					</div>
					<div style="">stateful with children</div>
					<article style="">
						<h1>stateful</h1>{"tag":"article"}
					</article>
					wrapped text
					Test
				`);
				console.log('--------------------------------------------');
			});
			resolve2();

			return final2;
		});
		resolve();

		return final;
	});
});
