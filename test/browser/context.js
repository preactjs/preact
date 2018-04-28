import { h, render as prender, Component, createContext } from '../../src/preact';
/** @jsx h */
import * as sinon from "sinon";

const CHILDREN_MATCHER = sinon.match( v => v==null || Array.isArray(v) && !v.length , '[empty children]');

describe('context', () => {
	let scratch;

	function render(comp) {
		return prender(comp, scratch, scratch.lastChild);
	}

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	it('should pass context to grandchildren', () => {
		const CONTEXT = { a:'a' };
		const PROPS = { b:'b' };
		// let inner;

		class Outer extends Component {
			getChildContext() {
				return CONTEXT;
			}
			render(props) {
				return <div><Inner {...props} /></div>;
			}
		}
		sinon.spy(Outer.prototype, 'getChildContext');

		class Inner extends Component {
			// constructor() {
			// 	super();
			// 	inner = this;
			// }
			shouldComponentUpdate() { return true; }
			componentWillReceiveProps() {}
			componentWillUpdate() {}
			componentDidUpdate() {}
			render(props, state, context) {
				return <div>{ context && context.a }</div>;
			}
		}
		sinon.spy(Inner.prototype, 'shouldComponentUpdate');
		sinon.spy(Inner.prototype, 'componentWillReceiveProps');
		sinon.spy(Inner.prototype, 'componentWillUpdate');
		sinon.spy(Inner.prototype, 'componentDidUpdate');
		sinon.spy(Inner.prototype, 'render');

		render(<Outer />);

		expect(Outer.prototype.getChildContext).to.have.been.calledOnce;

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWith({ children:CHILDREN_MATCHER }, {}, CONTEXT);

		CONTEXT.foo = 'bar';
		render(<Outer {...PROPS} />);

		expect(Outer.prototype.getChildContext).to.have.been.calledTwice;

		let props = { children: CHILDREN_MATCHER, ...PROPS };
		expect(Inner.prototype.shouldComponentUpdate).to.have.been.calledOnce.and.calledWith(props, {}, CONTEXT);
		expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledWith(props, CONTEXT);
		expect(Inner.prototype.componentWillUpdate).to.have.been.calledWith(props, {});
		expect(Inner.prototype.componentDidUpdate).to.have.been.calledWith({ children:CHILDREN_MATCHER }, {});
		expect(Inner.prototype.render).to.have.been.calledWith(props, {}, CONTEXT);


		/* Future:
		 *  Newly created context objects are *not* currently cloned.
		 *  This test checks that they *are* cloned.
		 */
		// Inner.prototype.render.resetHistory();
		// CONTEXT.foo = 'baz';
		// inner.forceUpdate();
		// expect(Inner.prototype.render).to.have.been.calledWith(PROPS, {}, { a:'a', foo:'bar' });
	});

	it('should pass context to direct children', () => {
		const CONTEXT = { a:'a' };
		const PROPS = { b:'b' };

		class Outer extends Component {
			getChildContext() {
				return CONTEXT;
			}
			render(props) {
				return <Inner {...props} />;
			}
		}
		sinon.spy(Outer.prototype, 'getChildContext');

		class Inner extends Component {
			shouldComponentUpdate() { return true; }
			componentWillReceiveProps() {}
			componentWillUpdate() {}
			componentDidUpdate() {}
			render(props, state, context) {
				return <div>{ context && context.a }</div>;
			}
		}
		sinon.spy(Inner.prototype, 'shouldComponentUpdate');
		sinon.spy(Inner.prototype, 'componentWillReceiveProps');
		sinon.spy(Inner.prototype, 'componentWillUpdate');
		sinon.spy(Inner.prototype, 'componentDidUpdate');
		sinon.spy(Inner.prototype, 'render');

		render(<Outer />);

		expect(Outer.prototype.getChildContext).to.have.been.calledOnce;

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWith({ children: CHILDREN_MATCHER }, {}, CONTEXT);

		CONTEXT.foo = 'bar';
		render(<Outer {...PROPS} />);

		expect(Outer.prototype.getChildContext).to.have.been.calledTwice;

		let props = { children: CHILDREN_MATCHER, ...PROPS };
		expect(Inner.prototype.shouldComponentUpdate).to.have.been.calledOnce.and.calledWith(props, {}, CONTEXT);
		expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledWith(props, CONTEXT);
		expect(Inner.prototype.componentWillUpdate).to.have.been.calledWith(props, {});
		expect(Inner.prototype.componentDidUpdate).to.have.been.calledWith({ children: CHILDREN_MATCHER }, {});
		expect(Inner.prototype.render).to.have.been.calledWith(props, {}, CONTEXT);

		// make sure render() could make use of context.a
		expect(Inner.prototype.render).to.have.returned(sinon.match({ children:['a'] }));
	});

	it('should preserve existing context properties when creating child contexts', () => {
		let outerContext = { outer:true },
			innerContext = { inner:true };
		class Outer extends Component {
			getChildContext() {
				return { outerContext };
			}
			render() {
				return <div><Inner /></div>;
			}
		}

		class Inner extends Component {
			getChildContext() {
				return { innerContext };
			}
			render() {
				return <InnerMost />;
			}
		}

		class InnerMost extends Component {
			render() {
				return <strong>test</strong>;
			}
		}

		sinon.spy(Inner.prototype, 'render');
		sinon.spy(InnerMost.prototype, 'render');

		render(<Outer />);

		expect(Inner.prototype.render).to.have.been.calledWith({ children: CHILDREN_MATCHER }, {}, { outerContext });
		expect(InnerMost.prototype.render).to.have.been.calledWith({ children: CHILDREN_MATCHER }, {}, { outerContext, innerContext });
	});

	describe("new API", () => {
		const sandbox = sinon.sandbox.create();

		afterEach(() => {
			sandbox.restore();
		});

		it("exposes a createContext function", () => {
			expect(createContext).to.exist;
		});

		describe("createContext", () => {
			it("creates an object with a Provider", () => {
				const ctx = createContext("");
				expect(ctx).haveOwnProperty("Provider");
			});

			it("creates an object with a Consumer", () => {
				const ctx = createContext("");
				expect(ctx).haveOwnProperty("Consumer");
			});
		});

		describe("Provider", () => {
			it("returns the given children as is", () => {
				const ctx = createContext("");
				render(<ctx.Provider value="a value">
						Hi from provider
					</ctx.Provider>);

				expect(scratch.innerHTML).to.eq("Hi from provider");
			});
		});

		describe("Consumer", () => {
			it("returns the given children as is", () => {
				const ctx = createContext("");
				render(<ctx.Provider value="init">
						<ctx.Consumer>Hi from consumer</ctx.Consumer>
					</ctx.Provider>);

				expect(scratch.innerHTML).to.eq("Hi from consumer");
			});

			it("executes the given children function", () => {
				const ctx = createContext("");
				render(<ctx.Provider value="init">
						<ctx.Consumer>{() => "Hi from function"}</ctx.Consumer>
					</ctx.Provider>);

				expect(scratch.innerHTML).to.eq("Hi from function");
			});

			// shall we suport also a render function or always asume
			// children as a function ?
			it.skip("executes the given render function", () => {
				const ctx = createContext("");
				render(<ctx.Provider value="init">
						<ctx.Consumer render={() => "Hi from render"} />
					</ctx.Provider>);

				expect(scratch.innerHTML).to.eq("Hi from render");
			});

			it("has access to the default value if no provider is given", () => {
				const ctx = createContext("The Default Context");
				render(<ctx.Consumer>{value => `Hi from '${value}'`}</ctx.Consumer>);
				expect(scratch.innerHTML).to.eq("Hi from 'The Default Context'");
			});

			it("has access to the provided value", () => {
				const ctx = createContext("The Default Context");
				render(<ctx.Provider value="The Provided Context">
						<ctx.Consumer>{value => `Hi from '${value}'`}</ctx.Consumer>
					</ctx.Provider>);
				expect(scratch.innerHTML).to.eq("Hi from 'The Provided Context'");
			});

			it("updates the value accordingly", () => {
				const ctx = createContext("The Default Context");
				const componentWillReceiveProps = sandbox.spy(ctx.Provider.prototype, "componentWillReceiveProps");
				render(<ctx.Provider value="The Provided Context">
						<ctx.Consumer>{value => `Hi from '${value}'`}</ctx.Consumer>
					</ctx.Provider>);

				// rerender
				render(<ctx.Provider value="The updated context">
						<ctx.Consumer>{value => `Hi from '${value}'`}</ctx.Consumer>
					</ctx.Provider>);

				expect(scratch.innerHTML).to.eq("Hi from 'The updated context'");
				expect(componentWillReceiveProps).to.have.been.calledWithMatch({
					value: "The updated context"
				});
			});
		});
	});
});
