import { h, render, createContext, Component } from 'preact';
import { act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useContext, useEffect, useState } from '../../src';

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

	it('should use default value', () => {
		const Foo = createContext(42);
		const spy = sinon.spy();

		function App() {
			spy(useContext(Foo));
			return <div />;
		}

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

		function Comp() {
			const value = useContext(Ctx);
			spy(value);
			return <h1>{value}</h1>;
		}

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

		function Comp() {
			const value = useContext(Ctx);
			spy(value);
			return <h1>{value}</h1>;
		}

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

		function Comp() {
			const foo = useContext(Foo);
			const bar = useContext(Bar);
			spy(foo, bar);
			useEffect(() =>	() => unmountspy());

			return <div />;
		}

		render((
			<Foo.Provider value={0}>
				<Bar.Provider value={10}>
					<Comp />
				</Bar.Provider>
			</Foo.Provider>
		), scratch);

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(0, 10);

		render((
			<Foo.Provider value={11}>
				<Bar.Provider value={42}>
					<Comp />
				</Bar.Provider>
			</Foo.Provider>
		), scratch);

		 expect(spy).to.be.calledTwice;
		 expect(unmountspy).not.to.be.called;
	});

	it('should maintain context', () => {
		const context = createContext(null);
		const { Provider } = context;
		const configMain = { name: 'main' };
		const configChild = { name: 'child' };
		let childSet, mainSet, childValue, mainValue;

		const Input = () => {
			const config = useContext(context);
			const [input, set] = useState('');

			if (config.name === 'main') {
				mainSet = set;
				mainValue = input;
			}
			else {
				childValue = input;
				childSet = set;
			}

			return (
				<div>
					{config.name}
					<input value={input} />
				</div>
			);
		};

		const ChatApp = (props) => {
			const [config, setConfig] = useState({});

			useEffect(() => {
				setConfig(props.config);
			}, [props.config]);

			return (
				<Provider value={config}>
					<Input />
				</Provider>
			);
		};

		act(() => render(<ChatApp config={configMain} />, scratch));
		expect(scratch.innerHTML).to.equal('<div>main<input></div>');

		const div = document.createElement('div');
		scratch.appendChild(div);
		act(() => render(<ChatApp config={configChild} />, div));
		expect(scratch.innerHTML).to.equal('<div>main<input></div><div><div>child<input></div></div>');

		act(() => mainSet('hi'));
		expect(childValue).to.equal('');
		expect(mainValue).to.equal('hi');
		expect(scratch.innerHTML).to.equal('<div>main<input></div><div><div>child<input></div></div>');

		act(() => childSet('bye'));
		expect(childValue).to.equal('bye');
		expect(mainValue).to.equal('hi');
		expect(scratch.innerHTML).to.equal('<div>main<input></div><div><div>child<input></div></div>');
	});
});
