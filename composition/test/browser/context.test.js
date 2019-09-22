import { h, render, createContext, Component } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, watch, onUnmounted } from '../../src';

/** @jsx h */

describe('context', () => {

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

		const Comp = createComponent(() => {
			const ctx = watch(Context);
			return () => {
				values.push(ctx.value);
				return null;
			};
		});

		render(<Comp />, scratch);
		render(
			<Context.Provider value={42}>
				<Comp />
			</Context.Provider>,
			scratch
		);
		render(
			<Context.Provider value={69}>
				<Comp />
			</Context.Provider>,
			scratch
		);

		expect(values).to.deep.equal([13, 42, 69]);
	});

	it('should use default value', () => {
		const Foo = createContext(42);
		const spy = sinon.spy();

		const App = createComponent(() => {
			spy(watch(Foo).value);
			return () => <div />;
		});

		render(<App />, scratch);
		expect(spy).to.be.calledWith(42);
	});

	it('should update when value changes with nonUpdating Component on top', done => {
		const spy = sinon.spy();
		const Ctx = createContext(0);

		class NoUpdate extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render() {
				return this.props.children;
			}
		}

		function App(props) {
			return (
				<Ctx.Provider value={props.value}>
					<NoUpdate>
						<Comp />
					</NoUpdate>
				</Ctx.Provider>
			);
		}

		const Comp = createComponent(() => {
			const ctx = watch(Ctx);
			return () => {
				spy(ctx.value);
				return <h1>{ctx.value}</h1>;
			};
		});

		render(<App value={0} />, scratch);
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(0);
		render(<App value={1} />, scratch);

		// Wait for enqueued hook update
		setTimeout(() => {
			// Should not be called a third time
			expect(spy).to.be.calledTwice;
			expect(spy).to.be.calledWith(1);
			done();
		}, 0);
	});

	it('should only update when value has changed', done => {
		const spy = sinon.spy();
		const Ctx = createContext(0);

		function App(props) {
			return (
				<Ctx.Provider value={props.value}>
					<Comp />
				</Ctx.Provider>
			);
		}

		const Comp = createComponent(() => {
			const ctx = watch(Ctx);
			return () => {
				spy(ctx.value);
				return <h1>{ctx.value}</h1>;
			};
		});

		render(<App value={0} />, scratch);
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(0);
		render(<App value={1} />, scratch);

		expect(spy).to.be.calledTwice;
		expect(spy).to.be.calledWith(1);

		// Wait for enqueued hook update
		setTimeout(() => {
			// Should not be called a third time
			expect(spy).to.be.calledTwice;
			done();
		}, 0);
	});

	it('should allow multiple context hooks at the same time', () => {
		const Foo = createContext(0);
		const Bar = createContext(10);
		const spy = sinon.spy();
		const unmountspy = sinon.spy();

		const Comp = createComponent(() => {
			const foo = watch(Foo);
			const bar = watch(Bar);
			onUnmounted(() => unmountspy());

			return () => {
				spy(foo.value, bar.value);
				return <div />;
			};
		});

		render(
			<Foo.Provider value={0}>
				<Bar.Provider value={10}>
					<Comp />
				</Bar.Provider>
			</Foo.Provider>,
			scratch
		);

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(0, 10);

		render(
			<Foo.Provider value={11}>
				<Bar.Provider value={42}>
					<Comp />
				</Bar.Provider>
			</Foo.Provider>,
			scratch
		);

		expect(spy).to.be.calledTwice;
		expect(unmountspy).not.to.be.called;
	});
});
