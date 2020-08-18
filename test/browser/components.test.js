import { createElement, render, Component, Fragment } from 'preact';
import { setupRerender } from 'preact/test-utils';
import {
	setupScratch,
	teardown,
	getMixedArray,
	mixedArrayHTML,
	serializeHtml,
	sortAttributes,
	spyAll
} from '../_util/helpers';
import { div, span, p } from '../_util/dom';

/** @jsx createElement */
const h = createElement;

function getAttributes(node) {
	let attrs = {};
	if (node.attributes) {
		for (let i = node.attributes.length; i--; ) {
			attrs[node.attributes[i].name] = node.attributes[i].value;
		}
	}
	return attrs;
}

describe('Components', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('Component construction', () => {
		/** @type {object} */
		let instance;
		let PROPS;
		let STATE;

		beforeEach(() => {
			instance = null;
			PROPS = { foo: 'bar', onBaz: () => {} };
			STATE = { text: 'Hello' };
		});

		it('should render components', () => {
			class C1 extends Component {
				render() {
					return <div>C1</div>;
				}
			}
			sinon.spy(C1.prototype, 'render');
			render(<C1 />, scratch);

			expect(C1.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch({}, {})
				.and.to.have.returned(sinon.match({ type: 'div' }));

			expect(scratch.innerHTML).to.equal('<div>C1</div>');
		});

		it('should render functional components', () => {
			const C3 = sinon.spy(props => <div {...props} />);

			render(<C3 {...PROPS} />, scratch);

			expect(C3)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(
					sinon.match({
						type: 'div',
						props: PROPS
					})
				);

			expect(scratch.innerHTML).to.equal('<div foo="bar"></div>');
		});

		it('should render components with props', () => {
			let constructorProps;

			class C2 extends Component {
				constructor(props) {
					super(props);
					constructorProps = props;
				}
				render(props) {
					return <div {...props} />;
				}
			}
			sinon.spy(C2.prototype, 'render');

			render(<C2 {...PROPS} />, scratch);

			expect(constructorProps).to.deep.equal(PROPS);

			expect(C2.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS, {})
				.and.to.have.returned(
					sinon.match({
						type: 'div',
						props: PROPS
					})
				);

			expect(scratch.innerHTML).to.equal('<div foo="bar"></div>');
		});

		it('should not crash when setting state in constructor', () => {
			class Foo extends Component {
				constructor(props) {
					super(props);
					// the following line made `this._nextState !== this.state` be truthy prior to the fix for preactjs/preact#2638
					this.state = {};
					this.setState({ preact: 'awesome' });
				}
			}

			expect(() => render(<Foo foo="bar" />, scratch)).not.to.throw();
			rerender();
		});

		it('should not crash when setting state with cb in constructor', () => {
			let spy = sinon.spy();
			class Foo extends Component {
				constructor(props) {
					super(props);
					this.setState({ preact: 'awesome' }, spy);
				}
			}

			expect(() => render(<Foo foo="bar" />, scratch)).not.to.throw();
			rerender();
			expect(spy).to.not.be.called;
		});

		it('should not crash when calling forceUpdate with cb in constructor', () => {
			let spy = sinon.spy();
			class Foo extends Component {
				constructor(props) {
					super(props);
					this.forceUpdate(spy);
				}
			}

			expect(() => render(<Foo foo="bar" />, scratch)).not.to.throw();
			rerender();
			expect(spy).to.not.be.called;
		});

		it('should accurately call nested setState callbacks', () => {
			let states = [];
			let finalState;
			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = { a: 'b' };
				}

				componentDidMount() {
					states.push(this.state);
					expect(scratch.innerHTML).to.equal('<p>b</p>');

					// eslint-disable-next-line
					this.setState({ a: 'a' }, () => {
						states.push(this.state);
						expect(scratch.innerHTML).to.equal('<p>a</p>');

						this.setState({ a: 'c' }, () => {
							expect(scratch.innerHTML).to.equal('<p>c</p>');
							states.push(this.state);
						});
					});
				}

				render() {
					finalState = this.state;
					return <p>{this.state.a}</p>;
				}
			}

			render(<Foo />, scratch);
			rerender(); // First setState
			rerender(); // Second setState

			let [firstState, secondState, thirdState] = states;
			expect(finalState).to.deep.equal({ a: 'c' });
			expect(firstState).to.deep.equal({ a: 'b' });
			expect(secondState).to.deep.equal({ a: 'a' });
			expect(thirdState).to.deep.equal({ a: 'c' });
		});

		it('should initialize props & context but not state in Component constructor', () => {
			// Not initializing state matches React behavior: https://codesandbox.io/s/rml19v8o2q
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					expect(this.props).to.equal(props);
					expect(this.state).to.deep.equal(undefined);
					expect(this.context).to.equal(context);

					instance = this;
				}
				render(props) {
					return <div {...props}>Hello</div>;
				}
			}

			sinon.spy(Foo.prototype, 'render');

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS, {}, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal({});
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it("should render Component classes that don't pass args into the Component constructor", () => {
			function Foo() {
				Component.call(this);
				instance = this;
				this.state = STATE;
			}
			Foo.prototype.render = sinon.spy((props, state) => (
				<div {...props}>{state.text}</div>
			));

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(
					PROPS,
					STATE,
					{}
				)
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should also update the current dom', () => {
			let trigger;

			class A extends Component {
				constructor(props) {
					super(props);
					this.state = { show: false };
					trigger = this.set = this.set.bind(this);
				}

				set() {
					this.setState({ show: true });
				}

				render() {
					return this.state.show ? <div>A</div> : null;
				}
			}

			const B = () => <p>B</p>;

			render(
				<div>
					<A />
					<B />
				</div>,
				scratch
			);
			expect(scratch.innerHTML).to.equal('<div><p>B</p></div>');

			trigger();
			rerender();
			expect(scratch.innerHTML).to.equal('<div><div>A</div><p>B</p></div>');
		});

		it('should not orphan children', () => {
			let triggerC, triggerA;
			const B = () => <p>B</p>;

			// Component with state which swaps its returned element type
			class C extends Component {
				constructor(props) {
					super(props);
					this.state = { show: false };
					triggerC = this.set = this.set.bind(this);
				}

				set() {
					this.setState({ show: true });
				}

				render() {
					return this.state.show ? <div>data</div> : <p>Loading</p>;
				}
			}

			const WrapC = () => <C />;

			class A extends Component {
				constructor(props) {
					super(props);
					this.state = { show: false };
					triggerA = this.set = this.set.bind(this);
				}

				set() {
					this.setState({ show: true });
				}

				render() {
					return this.state.show ? <B /> : <WrapC />;
				}
			}

			render(<A />, scratch);
			expect(scratch.innerHTML).to.equal('<p>Loading</p>');

			triggerC();
			rerender();
			expect(scratch.innerHTML).to.equal('<div>data</div>');

			triggerA();
			rerender();
			expect(scratch.innerHTML).to.equal('<p>B</p>');
		});

		it("should render components that don't pass args into the Component constructor (unistore pattern)", () => {
			// Pattern unistore uses for connect: https://git.io/fxRqu
			function Wrapper() {
				instance = this;
				this.state = STATE;
				this.render = sinon.spy((props, state) => (
					<div {...props}>{state.text}</div>
				));
			}
			(Wrapper.prototype = new Component()).constructor = Wrapper;

			render(<Wrapper {...PROPS} />, scratch);

			expect(instance.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(
					PROPS,
					STATE,
					{}
				)
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it("should render components that don't call Component constructor", () => {
			function Foo() {
				instance = this;
				this.state = STATE;
			}
			Foo.prototype = Object.create(Component);
			Foo.prototype.render = sinon.spy((props, state) => (
				<div {...props}>{state.text}</div>
			));

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(
					PROPS,
					STATE,
					{}
				)
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it("should render components that don't call Component constructor and don't initialize state", () => {
			function Foo() {
				instance = this;
			}
			Foo.prototype.render = sinon.spy(props => <div {...props}>Hello</div>);

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS, {}, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal({});
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it("should render components that don't inherit from Component", () => {
			class Foo {
				constructor() {
					instance = this;
					this.state = STATE;
				}
				render(props, state) {
					return <div {...props}>{state.text}</div>;
				}
			}
			sinon.spy(Foo.prototype, 'render');

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(
					PROPS,
					STATE,
					{}
				)
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it("should render components that don't inherit from Component (unistore pattern)", () => {
			// Pattern unistore uses for Provider: https://git.io/fxRqR
			function Provider() {
				instance = this;
				this.state = STATE;
			}
			Provider.prototype.render = sinon.spy((props, state) => (
				<div {...PROPS}>{state.text}</div>
			));

			render(<Provider {...PROPS} />, scratch);

			expect(Provider.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(
					PROPS,
					STATE,
					{}
				)
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it("should render components that don't inherit from Component and don't initialize state", () => {
			class Foo {
				constructor() {
					instance = this;
				}
				render(props, state) {
					return <div {...props}>Hello</div>;
				}
			}
			sinon.spy(Foo.prototype, 'render');

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS, {}, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal({});
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render class components that inherit from Component without a render method', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					instance = this;
				}
			}

			sinon.spy(Foo.prototype, 'render');

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS, {}, {})
				.and.to.have.returned(undefined);
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal({});
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('');
		});
	});

	it('should render string', () => {
		class StringComponent extends Component {
			render() {
				return 'Hi there';
			}
		}

		render(<StringComponent />, scratch);
		expect(scratch.innerHTML).to.equal('Hi there');
	});

	it('should render number as string', () => {
		class NumberComponent extends Component {
			render() {
				return 42;
			}
		}

		render(<NumberComponent />, scratch);
		expect(scratch.innerHTML).to.equal('42');
	});

	it('should render null as empty string', () => {
		class NullComponent extends Component {
			render() {
				return null;
			}
		}

		render(<NullComponent />, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	// Test for Issue #73
	it('should remove orphaned elements replaced by Components', () => {
		class Comp extends Component {
			render() {
				return <span>span in a component</span>;
			}
		}

		let root;
		function test(content) {
			root = render(content, scratch, root);
		}

		test(<Comp />);
		test(<div>just a div</div>);
		test(<Comp />);

		expect(scratch.innerHTML).to.equal('<span>span in a component</span>');
	});

	// Test for Issue preactjs/preact#176
	it('should remove children when root changes to text node', () => {
		/** @type {import('preact').Component} */
		let comp;

		class Comp extends Component {
			constructor() {
				super();
				comp = this;
			}
			render(_, { alt }) {
				return alt ? 'asdf' : <div>test</div>;
			}
		}

		render(<Comp />, scratch);

		comp.setState({ alt: true });
		comp.forceUpdate();
		rerender();
		expect(scratch.innerHTML, 'switching to textnode').to.equal('asdf');

		comp.setState({ alt: false });
		comp.forceUpdate();
		rerender();
		expect(scratch.innerHTML, 'switching to element').to.equal(
			'<div>test</div>'
		);

		comp.setState({ alt: true });
		comp.forceUpdate();
		rerender();
		expect(scratch.innerHTML, 'switching to textnode 2').to.equal('asdf');
	});

	// Test for Issue preactjs/preact#1616
	it('should maintain order when setting state (that inserts dom-elements)', () => {
		let add, addTwice, reset;
		const Entry = props => <div>{props.children}</div>;

		class App extends Component {
			constructor(props) {
				super(props);

				this.state = { values: ['abc'] };

				add = this.add = this.add.bind(this);
				addTwice = this.addTwice = this.addTwice.bind(this);
				reset = this.reset = this.reset.bind(this);
			}

			add() {
				this.setState({ values: [...this.state.values, 'def'] });
			}

			addTwice() {
				this.setState({ values: [...this.state.values, 'def', 'ghi'] });
			}

			reset() {
				this.setState({ values: ['abc'] });
			}

			render() {
				return (
					<div>
						{this.state.values.map(v => (
							<Entry>{v}</Entry>
						))}
						<button>First Button</button>
						<button>Second Button</button>
						<button>Third Button</button>
					</div>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.firstChild.innerHTML).to.equal(
			'<div>abc</div>' +
				'<button>First Button</button><button>Second Button</button><button>Third Button</button>'
		);

		add();
		rerender();
		expect(scratch.firstChild.innerHTML).to.equal(
			'<div>abc</div><div>def' +
				'</div><button>First Button</button><button>Second Button</button><button>Third Button</button>'
		);

		add();
		rerender();
		expect(scratch.firstChild.innerHTML).to.equal(
			'<div>abc</div><div>def</div><div>def' +
				'</div><button>First Button</button><button>Second Button</button><button>Third Button</button>'
		);

		reset();
		rerender();
		expect(scratch.firstChild.innerHTML).to.equal(
			'<div>abc</div>' +
				'<button>First Button</button><button>Second Button</button><button>Third Button</button>'
		);

		addTwice();
		rerender();
		expect(scratch.firstChild.innerHTML).to.equal(
			'<div>abc</div><div>def</div><div>ghi' +
				'</div><button>First Button</button><button>Second Button</button><button>Third Button</button>'
		);
	});

	// Test for Issue preactjs/preact#254
	it('should not recycle common class children with different keys', () => {
		let idx = 0;
		let msgs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
		let sideEffect = sinon.spy();

		class Comp extends Component {
			componentWillMount() {
				this.innerMsg = msgs[idx++ % 8];
				sideEffect();
			}
			render() {
				return <div>{this.innerMsg}</div>;
			}
		}
		sinon.spy(Comp.prototype, 'componentWillMount');

		let good, bad;
		class GoodContainer extends Component {
			constructor(props) {
				super(props);
				this.state = { alt: false };
				good = this;
			}

			render(_, { alt }) {
				return (
					<div>
						{alt ? null : <Comp key={1} alt={alt} />}
						{alt ? null : <Comp key={2} alt={alt} />}
						{alt ? <Comp key={3} alt={alt} /> : null}
					</div>
				);
			}
		}

		class BadContainer extends Component {
			constructor(props) {
				super(props);
				this.state = { alt: false };
				bad = this;
			}

			render(_, { alt }) {
				return (
					<div>
						{alt ? null : <Comp alt={alt} />}
						{alt ? null : <Comp alt={alt} />}
						{alt ? <Comp alt={alt} /> : null}
					</div>
				);
			}
		}

		render(<GoodContainer />, scratch);
		expect(scratch.textContent, 'new component with key present').to.equal(
			'AB'
		);
		expect(Comp.prototype.componentWillMount).to.have.been.calledTwice;
		expect(sideEffect).to.have.been.calledTwice;

		sideEffect.resetHistory();
		Comp.prototype.componentWillMount.resetHistory();
		good.setState({ alt: true });
		rerender();
		expect(
			scratch.textContent,
			'new component with key present re-rendered'
		).to.equal('C');
		//we are recycling the first 2 components already rendered, just need a new one
		expect(Comp.prototype.componentWillMount).to.have.been.calledOnce;
		expect(sideEffect).to.have.been.calledOnce;

		sideEffect.resetHistory();
		Comp.prototype.componentWillMount.resetHistory();
		render(<BadContainer />, scratch);
		expect(scratch.textContent, 'new component without key').to.equal('DE');
		expect(Comp.prototype.componentWillMount).to.have.been.calledTwice;
		expect(sideEffect).to.have.been.calledTwice;

		sideEffect.resetHistory();
		Comp.prototype.componentWillMount.resetHistory();
		bad.setState({ alt: true });
		rerender();

		expect(
			scratch.textContent,
			'use null placeholders to detect new component is appended'
		).to.equal('F');
		expect(Comp.prototype.componentWillMount).to.be.calledOnce;
		expect(sideEffect).to.be.calledOnce;
	});

	describe('array children', () => {
		it("should render DOM element's array children", () => {
			render(<div>{getMixedArray()}</div>, scratch);
			expect(scratch.firstChild.innerHTML).to.equal(mixedArrayHTML);
		});

		it("should render Component's array children", () => {
			const Foo = () => getMixedArray();

			render(<Foo />, scratch);

			expect(scratch.innerHTML).to.equal(mixedArrayHTML);
		});

		it("should render Fragment's array children", () => {
			const Foo = () => <Fragment>{getMixedArray()}</Fragment>;

			render(<Foo />, scratch);

			expect(scratch.innerHTML).to.equal(mixedArrayHTML);
		});

		it('should render sibling array children', () => {
			const Todo = () => (
				<ul>
					<li>A header</li>
					{['a', 'b'].map(value => (
						<li>{value}</li>
					))}
					<li>A divider</li>
					{['c', 'd'].map(value => (
						<li>{value}</li>
					))}
					<li>A footer</li>
				</ul>
			);

			render(<Todo />, scratch);

			let ul = scratch.firstChild;
			expect(ul.childNodes.length).to.equal(7);
			expect(ul.childNodes[0].textContent).to.equal('A header');
			expect(ul.childNodes[1].textContent).to.equal('a');
			expect(ul.childNodes[2].textContent).to.equal('b');
			expect(ul.childNodes[3].textContent).to.equal('A divider');
			expect(ul.childNodes[4].textContent).to.equal('c');
			expect(ul.childNodes[5].textContent).to.equal('d');
			expect(ul.childNodes[6].textContent).to.equal('A footer');
		});
	});

	describe('props.children', () => {
		let children;

		let Foo = props => {
			children = props.children;
			return <div>{props.children}</div>;
		};

		let FunctionFoo = props => {
			children = props.children;
			return <div>{props.children(2)}</div>;
		};

		let Bar = () => <span>Bar</span>;

		beforeEach(() => {
			children = undefined;
		});

		it('should support passing children as a prop', () => {
			const Foo = props => <div {...props} />;

			render(
				<Foo a="b" children={[<span class="bar">bar</span>, '123', 456]} />,
				scratch
			);

			expect(scratch.innerHTML).to.equal(
				'<div a="b"><span class="bar">bar</span>123456</div>'
			);
		});

		it('should be ignored when explicit children exist', () => {
			const Foo = props => <div {...props}>a</div>;

			render(<Foo children={'b'} />, scratch);

			expect(scratch.innerHTML).to.equal('<div>a</div>');
		});

		it('should be undefined with no child', () => {
			render(<Foo />, scratch);

			expect(children).to.be.undefined;
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should be undefined with null as a child', () => {
			render(<Foo>{null}</Foo>, scratch);

			expect(children).to.be.undefined;
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should be false with false as a child', () => {
			render(<Foo>{false}</Foo>, scratch);

			expect(children).to.be.false;
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should be true with true as a child', () => {
			render(<Foo>{true}</Foo>, scratch);

			expect(children).to.be.true;
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should be a string with a text child', () => {
			render(<Foo>text</Foo>, scratch);

			expect(children).to.be.a('string');
			expect(children).to.equal('text');
			expect(scratch.innerHTML).to.equal('<div>text</div>');
		});

		it('should be a string with a number child', () => {
			render(<Foo>1</Foo>, scratch);

			expect(children).to.be.a('string');
			expect(children).to.equal('1');
			expect(scratch.innerHTML).to.equal('<div>1</div>');
		});

		it('should be a VNode with a DOM node child', () => {
			render(
				<Foo>
					<span />
				</Foo>,
				scratch
			);

			expect(children).to.be.an('object');
			expect(children.type).to.equal('span');
			expect(scratch.innerHTML).to.equal('<div><span></span></div>');
		});

		it('should be a VNode with a Component child', () => {
			render(
				<Foo>
					<Bar />
				</Foo>,
				scratch
			);

			expect(children).to.be.an('object');
			expect(children.type).to.equal(Bar);
			expect(scratch.innerHTML).to.equal('<div><span>Bar</span></div>');
		});

		it('should be a function with a function child', () => {
			const child = num => num.toFixed(2);
			render(<FunctionFoo>{child}</FunctionFoo>, scratch);

			expect(children).to.be.an('function');
			expect(children).to.equal(child);
			expect(scratch.innerHTML).to.equal('<div>2.00</div>');
		});

		it('should be an array with multiple children', () => {
			render(
				<Foo>
					0<span />
					<input />
					<div />1
				</Foo>,
				scratch
			);

			expect(children).to.be.an('array');
			expect(children[0]).to.equal('0');
			expect(children[1].type).to.equal('span');
			expect(children[2].type).to.equal('input');
			expect(children[3].type).to.equal('div');
			expect(children[4]).to.equal('1');
			expect(scratch.innerHTML).to.equal(
				`<div>0<span></span><input><div></div>1</div>`
			);
		});

		it('should be an array with an array as children', () => {
			const mixedArray = getMixedArray();
			render(<Foo>{mixedArray}</Foo>, scratch);

			expect(children).to.be.an('array');
			expect(children).to.deep.equal(mixedArray);
			expect(scratch.innerHTML).to.equal(`<div>${mixedArrayHTML}</div>`);
		});

		it('should not flatten sibling and nested arrays', () => {
			const list1 = [0, 1];
			const list2 = [2, 3];
			const list3 = [4, 5];
			const list4 = [6, 7];
			const list5 = [8, 9];

			render(
				<Foo>
					{[list1, list2]}
					{[list3, list4]}
					{list5}
				</Foo>,
				scratch
			);

			expect(children).to.be.an('array');
			expect(children).to.deep.equal([[list1, list2], [list3, list4], list5]);
			expect(scratch.innerHTML).to.equal('<div>0123456789</div>');
		});
	});

	describe('High-Order Components', () => {
		it('should render wrapper HOCs', () => {
			const text = "We'll throw some happy little limbs on this tree.";

			function withBobRoss(ChildComponent) {
				return class BobRossIpsum extends Component {
					getChildContext() {
						return { text };
					}

					render(props) {
						return <ChildComponent {...props} />;
					}
				};
			}

			const PaintSomething = (props, context) => <div>{context.text}</div>;
			const Paint = withBobRoss(PaintSomething);

			render(<Paint />, scratch);
			expect(scratch.innerHTML).to.equal(`<div>${text}</div>`);
		});

		it('should render HOCs with generic children', () => {
			const text =
				"Let your imagination just wonder around when you're doing these things.";

			class BobRossProvider extends Component {
				getChildContext() {
					return { text };
				}

				render(props) {
					return props.children;
				}
			}

			function BobRossConsumer(props, context) {
				return props.children(context.text);
			}

			const Say = props => <div>{props.text}</div>;

			const Speak = () => (
				<BobRossProvider>
					<span>A span</span>
					<BobRossConsumer>{text => <Say text={text} />}</BobRossConsumer>
					<span>A final span</span>
				</BobRossProvider>
			);

			render(<Speak />, scratch);

			expect(scratch.innerHTML).to.equal(
				`<span>A span</span><div>${text}</div><span>A final span</span>`
			);
		});

		it('should render nested functional components', () => {
			const PROPS = { foo: 'bar', onBaz: () => {} };

			const Outer = sinon.spy(props => <Inner {...props} />);

			const Inner = sinon.spy(props => <div {...props}>inner</div>);

			render(<Outer {...PROPS} />, scratch);

			expect(Outer)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(
					sinon.match({
						type: Inner,
						props: PROPS
					})
				);

			expect(Inner)
				.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(
					sinon.match({
						type: 'div',
						props: { ...PROPS, children: 'inner' }
					})
				);

			expect(scratch.innerHTML).to.equal('<div foo="bar">inner</div>');
		});

		it('should re-render nested functional components', () => {
			let doRender = null;
			class Outer extends Component {
				componentDidMount() {
					let i = 1;
					doRender = () => this.setState({ i: ++i });
				}
				componentWillUnmount() {}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			sinon.spy(Outer.prototype, 'render');
			sinon.spy(Outer.prototype, 'componentWillUnmount');

			let j = 0;
			const Inner = sinon.spy(props => (
				<div j={++j} {...props}>
					inner
				</div>
			));

			render(<Outer foo="bar" />, scratch);

			// update & flush
			doRender();
			rerender();

			expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;

			expect(Inner).to.have.been.calledTwice;

			expect(Inner.secondCall)
				.to.have.been.calledWithMatch({ foo: 'bar', i: 2 })
				.and.to.have.returned(
					sinon.match({
						props: {
							j: 2,
							i: 2,
							foo: 'bar'
						}
					})
				);

			expect(getAttributes(scratch.firstElementChild)).to.eql({
				j: '2',
				i: '2',
				foo: 'bar'
			});

			// update & flush
			doRender();
			rerender();

			expect(Inner).to.have.been.calledThrice;

			expect(Inner.thirdCall)
				.to.have.been.calledWithMatch({ foo: 'bar', i: 3 })
				.and.to.have.returned(
					sinon.match({
						props: {
							j: 3,
							i: 3,
							foo: 'bar'
						}
					})
				);

			expect(getAttributes(scratch.firstElementChild)).to.eql({
				j: '3',
				i: '3',
				foo: 'bar'
			});
		});

		it('should re-render nested components', () => {
			let doRender = null,
				alt = false;

			class Outer extends Component {
				componentDidMount() {
					let i = 1;
					doRender = () => this.setState({ i: ++i });
				}
				componentWillUnmount() {}
				render(props, { i }) {
					if (alt) return <div is-alt />;
					return <Inner i={i} {...props} />;
				}
			}
			sinon.spy(Outer.prototype, 'render');
			sinon.spy(Outer.prototype, 'componentDidMount');
			sinon.spy(Outer.prototype, 'componentWillUnmount');

			let j = 0;
			class Inner extends Component {
				constructor(...args) {
					super();
				}
				componentWillMount() {}
				componentDidMount() {}
				componentWillUnmount() {}
				render(props) {
					return (
						<div j={++j} {...props}>
							inner
						</div>
					);
				}
			}
			sinon.spy(Inner.prototype, 'render');
			sinon.spy(Inner.prototype, 'componentWillMount');
			sinon.spy(Inner.prototype, 'componentDidMount');
			sinon.spy(Inner.prototype, 'componentWillUnmount');

			render(<Outer foo="bar" />, scratch);

			expect(Outer.prototype.componentDidMount).to.have.been.calledOnce;

			// update & flush
			doRender();
			rerender();

			expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;

			expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;
			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Inner.prototype.render).to.have.been.calledTwice;

			expect(Inner.prototype.render.secondCall)
				.to.have.been.calledWithMatch({ foo: 'bar', i: 2 })
				.and.to.have.returned(
					sinon.match({
						props: {
							j: 2,
							i: 2,
							foo: 'bar'
						}
					})
				);

			expect(getAttributes(scratch.firstElementChild)).to.eql({
				j: '2',
				i: '2',
				foo: 'bar'
			});

			expect(serializeHtml(scratch)).to.equal(
				sortAttributes('<div foo="bar" j="2" i="2">inner</div>')
			);

			// update & flush
			doRender();
			rerender();

			expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;
			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Inner.prototype.render).to.have.been.calledThrice;

			expect(Inner.prototype.render.thirdCall)
				.to.have.been.calledWithMatch({ foo: 'bar', i: 3 })
				.and.to.have.returned(
					sinon.match({
						props: {
							j: 3,
							i: 3,
							foo: 'bar'
						}
					})
				);

			expect(getAttributes(scratch.firstElementChild)).to.eql({
				j: '3',
				i: '3',
				foo: 'bar'
			});

			// update & flush
			alt = true;
			doRender();
			rerender();

			expect(Inner.prototype.componentWillUnmount).to.have.been.calledOnce;

			expect(scratch.innerHTML).to.equal('<div is-alt="true"></div>');

			// update & flush
			alt = false;
			doRender();
			rerender();

			expect(serializeHtml(scratch)).to.equal(
				sortAttributes('<div foo="bar" j="4" i="5">inner</div>')
			);
		});

		it('should resolve intermediary functional component', () => {
			let ctx = {};
			class Root extends Component {
				getChildContext() {
					return { ctx };
				}
				render() {
					return <Func />;
				}
			}
			const Func = () => <Inner />;
			class Inner extends Component {
				componentWillMount() {}
				componentDidMount() {}
				componentWillUnmount() {}
				render() {
					return <div>inner</div>;
				}
			}

			spyAll(Inner.prototype);

			render(<Root />, scratch);

			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentWillMount).to.have.been.calledBefore(
				Inner.prototype.componentDidMount
			);

			render(<asdf />, scratch);

			expect(Inner.prototype.componentWillUnmount).to.have.been.calledOnce;
		});

		it('should unmount children of high-order components without unmounting parent', () => {
			let outer,
				inner2,
				counter = 0;

			class Outer extends Component {
				constructor(props, context) {
					super(props, context);
					outer = this;
					this.state = {
						child: this.props.child
					};
				}
				componentWillUnmount() {}
				componentWillMount() {}
				componentDidMount() {}
				render(_, { child: C }) {
					return <C />;
				}
			}
			spyAll(Outer.prototype);

			class Inner extends Component {
				componentWillUnmount() {}
				componentWillMount() {}
				componentDidMount() {}
				render() {
					return h('element' + ++counter);
				}
			}
			spyAll(Inner.prototype);

			class Inner2 extends Component {
				constructor(props, context) {
					super(props, context);
					inner2 = this;
				}
				componentWillUnmount() {}
				componentWillMount() {}
				componentDidMount() {}
				render() {
					return h('element' + ++counter);
				}
			}
			spyAll(Inner2.prototype);

			render(<Outer child={Inner} />, scratch);

			// outer should only have been mounted once
			expect(Outer.prototype.componentWillMount, 'outer initial').to.have.been
				.calledOnce;
			expect(Outer.prototype.componentDidMount, 'outer initial').to.have.been
				.calledOnce;
			expect(Outer.prototype.componentWillUnmount, 'outer initial').not.to.have
				.been.called;

			// inner should only have been mounted once
			expect(Inner.prototype.componentWillMount, 'inner initial').to.have.been
				.calledOnce;
			expect(Inner.prototype.componentDidMount, 'inner initial').to.have.been
				.calledOnce;
			expect(Inner.prototype.componentWillUnmount, 'inner initial').not.to.have
				.been.called;

			outer.setState({ child: Inner2 });
			outer.forceUpdate();
			rerender();

			expect(Inner2.prototype.render).to.have.been.calledOnce;

			// outer should still only have been mounted once
			expect(Outer.prototype.componentWillMount, 'outer swap').to.have.been
				.calledOnce;
			expect(Outer.prototype.componentDidMount, 'outer swap').to.have.been
				.calledOnce;
			expect(Outer.prototype.componentWillUnmount, 'outer swap').not.to.have
				.been.called;

			// inner should only have been mounted once
			expect(Inner2.prototype.componentWillMount, 'inner2 swap').to.have.been
				.calledOnce;
			expect(Inner2.prototype.componentDidMount, 'inner2 swap').to.have.been
				.calledOnce;
			expect(Inner2.prototype.componentWillUnmount, 'inner2 swap').not.to.have
				.been.called;

			inner2.forceUpdate();
			rerender();

			expect(Inner2.prototype.render, 'inner2 update').to.have.been.calledTwice;
			expect(Inner2.prototype.componentWillMount, 'inner2 update').to.have.been
				.calledOnce;
			expect(Inner2.prototype.componentDidMount, 'inner2 update').to.have.been
				.calledOnce;
			expect(Inner2.prototype.componentWillUnmount, 'inner2 update').not.to.have
				.been.called;
		});

		it('should remount when swapping between HOC child types', () => {
			class Outer extends Component {
				render({ child: Child }) {
					return <Child />;
				}
			}

			class Inner extends Component {
				componentWillMount() {}
				componentWillUnmount() {}
				render() {
					return <div class="inner">foo</div>;
				}
			}
			spyAll(Inner.prototype);

			const InnerFunc = () => <div class="inner-func">bar</div>;

			render(<Outer child={Inner} />, scratch);

			expect(Inner.prototype.componentWillMount, 'initial mount').to.have.been
				.calledOnce;
			expect(Inner.prototype.componentWillUnmount, 'initial mount').not.to.have
				.been.called;

			Inner.prototype.componentWillMount.resetHistory();
			render(<Outer child={InnerFunc} />, scratch);

			expect(Inner.prototype.componentWillMount, 'unmount').not.to.have.been
				.called;
			expect(Inner.prototype.componentWillUnmount, 'unmount').to.have.been
				.calledOnce;

			Inner.prototype.componentWillUnmount.resetHistory();
			render(<Outer child={Inner} />, scratch);

			expect(Inner.prototype.componentWillMount, 'remount').to.have.been
				.calledOnce;
			expect(Inner.prototype.componentWillUnmount, 'remount').not.to.have.been
				.called;
		});
	});

	describe('Component Nesting', () => {
		let useIntermediary = false;

		let createComponent = Intermediary => {
			class C extends Component {
				componentWillMount() {}
				render({ children }) {
					if (!useIntermediary) return children;
					let I = useIntermediary === true ? Intermediary : useIntermediary;
					return <I>{children}</I>;
				}
			}
			spyAll(C.prototype);
			return C;
		};

		let createFunction = () => sinon.spy(({ children }) => children);

		let F1 = createFunction();
		let F2 = createFunction();
		let F3 = createFunction();

		let C1 = createComponent(F1);
		let C2 = createComponent(F2);
		let C3 = createComponent(F3);

		let reset = () =>
			[C1, C2, C3]
				.reduce(
					(acc, c) =>
						acc.concat(Object.keys(c.prototype).map(key => c.prototype[key])),
					[F1, F2, F3]
				)
				.forEach(c => c.resetHistory());

		it('should handle lifecycle for no intermediary in component tree', () => {
			reset();
			render(
				<C1>
					<C2>
						<C3>Some Text</C3>
					</C2>
				</C1>,
				scratch
			);

			expect(C1.prototype.componentWillMount, 'initial mount').to.have.been
				.calledOnce;
			expect(C2.prototype.componentWillMount, 'initial mount').to.have.been
				.calledOnce;
			expect(C3.prototype.componentWillMount, 'initial mount').to.have.been
				.calledOnce;

			reset();
			render(
				<C1>
					<C2>Some Text</C2>
				</C1>,
				scratch
			);

			expect(C1.prototype.componentWillMount, 'unmount innermost, C1').not.to
				.have.been.called;
			expect(C2.prototype.componentWillMount, 'unmount innermost, C2').not.to
				.have.been.called;

			reset();
			render(
				<C1>
					<C3>Some Text</C3>
				</C1>,
				scratch
			);

			expect(C1.prototype.componentWillMount, 'swap innermost').not.to.have.been
				.called;
			expect(C3.prototype.componentWillMount, 'swap innermost').to.have.been
				.calledOnce;

			reset();
			render(
				<C1>
					<C2>
						<C3>Some Text</C3>
					</C2>
				</C1>,
				scratch
			);

			expect(C1.prototype.componentWillMount, 'inject between, C1').not.to.have
				.been.called;
			expect(C2.prototype.componentWillMount, 'inject between, C2').to.have.been
				.calledOnce;
			expect(C3.prototype.componentWillMount, 'inject between, C3').to.have.been
				.calledOnce;
		});

		it('should handle lifecycle for nested intermediary functional components', () => {
			useIntermediary = true;

			render(<div />, scratch);
			reset();
			render(
				<C1>
					<C2>
						<C3>Some Text</C3>
					</C2>
				</C1>,
				scratch
			);

			expect(
				C1.prototype.componentWillMount,
				'initial mount w/ intermediary fn, C1'
			).to.have.been.calledOnce;
			expect(
				C2.prototype.componentWillMount,
				'initial mount w/ intermediary fn, C2'
			).to.have.been.calledOnce;
			expect(
				C3.prototype.componentWillMount,
				'initial mount w/ intermediary fn, C3'
			).to.have.been.calledOnce;

			reset();
			render(
				<C1>
					<C2>Some Text</C2>
				</C1>,
				scratch
			);

			expect(
				C1.prototype.componentWillMount,
				'unmount innermost w/ intermediary fn, C1'
			).not.to.have.been.called;
			expect(
				C2.prototype.componentWillMount,
				'unmount innermost w/ intermediary fn, C2'
			).not.to.have.been.called;

			reset();
			render(
				<C1>
					<C3>Some Text</C3>
				</C1>,
				scratch
			);

			expect(
				C1.prototype.componentWillMount,
				'swap innermost w/ intermediary fn'
			).not.to.have.been.called;
			expect(
				C3.prototype.componentWillMount,
				'swap innermost w/ intermediary fn'
			).to.have.been.calledOnce;

			reset();
			render(
				<C1>
					<C2>
						<C3>Some Text</C3>
					</C2>
				</C1>,
				scratch
			);

			expect(
				C1.prototype.componentWillMount,
				'inject between, C1 w/ intermediary fn'
			).not.to.have.been.called;
			expect(
				C2.prototype.componentWillMount,
				'inject between, C2 w/ intermediary fn'
			).to.have.been.calledOnce;
			expect(
				C3.prototype.componentWillMount,
				'inject between, C3 w/ intermediary fn'
			).to.have.been.calledOnce;
		});

		it('should render components by depth', () => {
			let spy = sinon.spy();
			let update;
			class Child extends Component {
				constructor(props) {
					super(props);
					update = () => {
						this.props.update();
						this.setState({});
					};
				}

				render() {
					spy();
					let items = [];
					for (let i = 0; i < this.props.items; i++) items.push(i);
					return <div>{items.join(',')}</div>;
				}
			}

			let i = 0;
			class Parent extends Component {
				render() {
					return <Child items={++i} update={() => this.setState({})} />;
				}
			}

			render(<Parent />, scratch);
			expect(spy).to.be.calledOnce;

			update();
			rerender();
			expect(spy).to.be.calledTwice;
		});

		it('should handle lifecycle for nested intermediary elements', () => {
			useIntermediary = 'div';

			render(<div />, scratch);
			reset();
			render(
				<C1>
					<C2>
						<C3>Some Text</C3>
					</C2>
				</C1>,
				scratch
			);

			expect(
				C1.prototype.componentWillMount,
				'initial mount w/ intermediary div, C1'
			).to.have.been.calledOnce;
			expect(
				C2.prototype.componentWillMount,
				'initial mount w/ intermediary div, C2'
			).to.have.been.calledOnce;
			expect(
				C3.prototype.componentWillMount,
				'initial mount w/ intermediary div, C3'
			).to.have.been.calledOnce;

			reset();
			render(
				<C1>
					<C2>Some Text</C2>
				</C1>,
				scratch
			);

			expect(
				C1.prototype.componentWillMount,
				'unmount innermost w/ intermediary div, C1'
			).not.to.have.been.called;
			expect(
				C2.prototype.componentWillMount,
				'unmount innermost w/ intermediary div, C2'
			).not.to.have.been.called;

			reset();
			render(
				<C1>
					<C3>Some Text</C3>
				</C1>,
				scratch
			);

			expect(
				C1.prototype.componentWillMount,
				'swap innermost w/ intermediary div'
			).not.to.have.been.called;
			expect(
				C3.prototype.componentWillMount,
				'swap innermost w/ intermediary div'
			).to.have.been.calledOnce;

			reset();
			render(
				<C1>
					<C2>
						<C3>Some Text</C3>
					</C2>
				</C1>,
				scratch
			);

			expect(
				C1.prototype.componentWillMount,
				'inject between, C1 w/ intermediary div'
			).not.to.have.been.called;
			expect(
				C2.prototype.componentWillMount,
				'inject between, C2 w/ intermediary div'
			).to.have.been.calledOnce;
			expect(
				C3.prototype.componentWillMount,
				'inject between, C3 w/ intermediary div'
			).to.have.been.calledOnce;
		});
	});

	it('should set component._vnode._dom when sCU returns false', () => {
		let parent;
		class Parent extends Component {
			render() {
				parent = this;
				return <Child />;
			}
		}

		let renderChildDiv = false;

		let child;
		class Child extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render() {
				child = this;
				if (!renderChildDiv) return null;
				return <div class="child" />;
			}
		}

		let app;
		class App extends Component {
			render() {
				app = this;
				return <Parent />;
			}
		}

		// TODO: Consider rewriting test to not rely on internal properties
		// and instead capture user-facing bug that would occur if this
		// behavior were broken
		const getDom = c => ('__v' in c ? c.__v.__e : c._vnode._dom);

		render(<App />, scratch);
		expect(getDom(child)).to.equalNode(child.base);

		app.forceUpdate();
		expect(getDom(child)).to.equalNode(child.base);

		parent.setState({});
		renderChildDiv = true;
		child.forceUpdate();
		expect(getDom(child)).to.equalNode(child.base);
		rerender();

		expect(getDom(child)).to.equalNode(child.base);

		renderChildDiv = false;
		app.setState({});
		child.forceUpdate();
		rerender();
		expect(getDom(child)).to.equalNode(child.base);
	});

	// preact/#1323
	it('should handle hoisted component vnodes without DOM', () => {
		let x = 0;
		let mounted = '';
		let unmounted = '';
		let updateAppState;

		class X extends Component {
			constructor(props) {
				super(props);
				this.name = `${x++}`;
			}

			componentDidMount() {
				mounted += `,${this.name}`;
			}

			componentWillUnmount() {
				unmounted += `,${this.name}`;
			}

			render() {
				return null;
			}
		}

		// Statically create X element
		const A = <X />;

		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { i: 0 };
				updateAppState = () => this.setState({ i: this.state.i + 1 });
			}

			render() {
				return (
					<div key={this.state.i}>
						{A}
						{A}
					</div>
				);
			}
		}

		render(<App />, scratch);

		updateAppState();
		rerender();
		updateAppState();
		rerender();

		expect(mounted).to.equal(',0,1,2,3,4,5');
		expect(unmounted).to.equal(',0,1,2,3');
	});

	describe('c.base', () => {
		/* eslint-disable lines-around-comment */
		/** @type {import('../../src').Component} */
		let parentDom1;
		/** @type {import('../../src').Component} */
		let parent1;
		/** @type {import('../../src').Component} */
		let parent2;
		/** @type {import('../../src').Component} */
		let maybe;
		/** @type {import('../../src').Component} */
		let child;
		/** @type {import('../../src').Component} */
		let sibling;
		/** @type {import('../../src').Component} */
		let nullInst;

		/** @type {() => void} */
		let toggleMaybeNull;
		/** @type {() => void} */
		let swapChildTag;

		function ParentWithDom(props) {
			parentDom1 = this;
			return <div>{props.children}</div>;
		}

		class Parent1 extends Component {
			render() {
				parent1 = this;
				return this.props.children;
			}
		}

		function Parent2(props) {
			parent2 = this;
			return props.children;
		}

		class MaybeNull extends Component {
			constructor(props) {
				super(props);
				maybe = this;
				this.state = { active: props.active || false };
				toggleMaybeNull = () =>
					this.setState(prev => ({
						active: !prev.active
					}));
			}
			render() {
				return this.state.active ? <div>maybe</div> : null;
			}
		}

		class Child extends Component {
			constructor(props) {
				super(props);
				child = this;
				this.state = { tagName: 'p' };
				swapChildTag = () =>
					this.setState(prev => ({
						tagName: prev.tagName == 'p' ? 'span' : 'p'
					}));
			}
			render() {
				return h(this.state.tagName, null, 'child');
			}
		}

		function Sibling(props) {
			sibling = this;
			return <p />;
		}

		function Null() {
			nullInst = this;
			return null;
		}

		afterEach(() => {
			parentDom1 = null;
			parent1 = null;
			parent2 = null;
			child = null;
			sibling = null;
		});

		it('should keep c.base up to date if a nested child component changes DOM nodes', () => {
			render(
				<ParentWithDom>
					<Parent1>
						<Parent2>
							<Child />
						</Parent2>
					</Parent1>
				</ParentWithDom>,
				scratch
			);

			expect(scratch.innerHTML).to.equal('<div><p>child</p></div>');
			expect(child.base).to.equalNode(scratch.firstChild.firstChild);
			expect(parent2.base).to.equalNode(child.base);
			expect(parent1.base).to.equalNode(child.base);
			expect(parentDom1.base).to.equalNode(scratch.firstChild);

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal('<div><span>child</span></div>');
			expect(child.base).to.equalNode(scratch.firstChild.firstChild);
			expect(parent2.base).to.equalNode(child.base);
			expect(parent1.base).to.equalNode(child.base);
			expect(parentDom1.base).to.equalNode(scratch.firstChild);
		});

		it('should not update sibling c.base if child component changes DOM nodes', () => {
			let s1 = {},
				s2 = {},
				s3 = {},
				s4 = {};

			render(
				<Fragment>
					<ParentWithDom>
						<Parent1>
							<Parent2>
								<Child />
								<Sibling ref={s1} />
							</Parent2>
							<Sibling ref={s2} />
						</Parent1>
						<Sibling ref={s3} />
					</ParentWithDom>
					<Sibling ref={s4} />
				</Fragment>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(
				'<div><p>child</p><p></p><p></p><p></p></div><p></p>'
			);
			expect(child.base).to.equalNode(scratch.firstChild.firstChild);
			expect(parent2.base).to.equalNode(child.base);
			expect(parent1.base).to.equalNode(child.base);
			expect(parentDom1.base).to.equalNode(scratch.firstChild);
			expect(s1.current.base).to.equalNode(scratch.firstChild.childNodes[1]);
			expect(s2.current.base).to.equalNode(scratch.firstChild.childNodes[2]);
			expect(s3.current.base).to.equalNode(scratch.firstChild.childNodes[3]);
			expect(s4.current.base).to.equalNode(scratch.lastChild);

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal(
				'<div><span>child</span><p></p><p></p><p></p></div><p></p>'
			);
			expect(child.base).to.equalNode(scratch.firstChild.firstChild);
			expect(parent2.base).to.equalNode(child.base);
			expect(parent1.base).to.equalNode(child.base);
			expect(parentDom1.base).to.equalNode(scratch.firstChild);
			expect(s1.current.base).to.equalNode(scratch.firstChild.childNodes[1]);
			expect(s2.current.base).to.equalNode(scratch.firstChild.childNodes[2]);
			expect(s3.current.base).to.equalNode(scratch.firstChild.childNodes[3]);
			expect(s4.current.base).to.equalNode(scratch.lastChild);
		});

		it('should not update parent c.base if child component changes DOM nodes and it is not first child component', () => {
			render(
				<Parent1>
					<Sibling />
					<Child />
				</Parent1>,
				scratch
			);

			expect(scratch.innerHTML).to.equal('<p></p><p>child</p>');
			expect(child.base).to.equalNode(scratch.lastChild);
			expect(sibling.base).to.equalNode(scratch.firstChild);
			expect(parent1.base).to.equalNode(sibling.base);

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal('<p></p><span>child</span>');
			expect(child.base).to.equalNode(scratch.lastChild);
			expect(sibling.base).to.equalNode(scratch.firstChild);
			expect(parent1.base).to.equalNode(sibling.base);
		});

		it('should update parent c.base if child component changes DOM nodes and it is first non-null child component', () => {
			render(
				<Parent1>
					<Null />
					<Child />
					<Sibling />
				</Parent1>,
				scratch
			);

			expect(scratch.innerHTML).to.equal('<p>child</p><p></p>');
			expect(nullInst.base).to.equalNode(null);
			expect(child.base).to.equalNode(scratch.firstChild);
			expect(sibling.base).to.equalNode(scratch.lastChild);
			expect(parent1.base).to.equalNode(child.base);

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal('<span>child</span><p></p>');
			expect(nullInst.base).to.equalNode(null);
			expect(child.base).to.equalNode(scratch.firstChild);
			expect(sibling.base).to.equalNode(scratch.lastChild);
			expect(parent1.base).to.equalNode(child.base);
		});

		it('should not update parent c.base if child component changes DOM nodes and a parent is not first child component', () => {
			render(
				<ParentWithDom>
					<Parent1>
						<Sibling />
						<Parent2>
							<Child />
						</Parent2>
					</Parent1>
				</ParentWithDom>,
				scratch
			);

			expect(scratch.innerHTML).to.equal('<div><p></p><p>child</p></div>');
			expect(child.base).to.equalNode(scratch.firstChild.lastChild);
			expect(parent2.base).to.equalNode(child.base);
			expect(sibling.base).to.equalNode(scratch.firstChild.firstChild);
			expect(parent1.base).to.equalNode(sibling.base);
			expect(parentDom1.base).to.equalNode(scratch.firstChild);

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal(
				'<div><p></p><span>child</span></div>'
			);
			expect(child.base).to.equalNode(scratch.firstChild.lastChild);
			expect(parent2.base).to.equalNode(child.base);
			expect(sibling.base).to.equalNode(scratch.firstChild.firstChild);
			expect(parent1.base).to.equalNode(sibling.base);
			expect(parentDom1.base).to.equalNode(scratch.firstChild);
		});

		it('should update parent c.base if first child becomes null', () => {
			render(
				<Parent1>
					<MaybeNull active />
					<Parent2>
						<Child />
					</Parent2>
				</Parent1>,
				scratch
			);

			expect(scratch.innerHTML).to.equal([div('maybe'), p('child')].join(''));
			expect(maybe.base).to.equalNode(
				scratch.firstChild,
				'initial - maybe.base'
			);
			expect(child.base).to.equalNode(
				scratch.lastChild,
				'initial - child.base'
			);
			expect(parent2.base).to.equalNode(child.base, 'initial - parent2.base');
			expect(parent1.base).to.equalNode(maybe.base, 'initial - parent1.base');

			toggleMaybeNull();
			rerender();

			expect(scratch.innerHTML).to.equal(p('child'));
			expect(maybe.base).to.equalNode(null, 'toggleMaybe - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'toggleMaybe - child.base'
			);
			expect(parent2.base).to.equalNode(
				child.base,
				'toggleMaybe - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				child.base,
				'toggleMaybe - parent1.base'
			);

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal(span('child'));
			expect(maybe.base).to.equalNode(null, 'swapChildTag - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'swapChildTag - child.base'
			);
			expect(parent2.base).to.equalNode(
				child.base,
				'swapChildTag - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				child.base,
				'swapChildTag - parent1.base'
			);
		});

		it('should update parent c.base if first child becomes non-null', () => {
			render(
				<Parent1>
					<MaybeNull />
					<Parent2>
						<Child />
					</Parent2>
				</Parent1>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(p('child'));
			expect(maybe.base).to.equalNode(null, 'initial - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'initial - child.base'
			);
			expect(parent2.base).to.equalNode(child.base, 'initial - parent2.base');
			expect(parent1.base).to.equalNode(child.base, 'initial - parent1.base');

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal(span('child'));
			expect(maybe.base).to.equalNode(null, 'swapChildTag - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'swapChildTag - child.base'
			);
			expect(parent2.base).to.equalNode(
				child.base,
				'swapChildTag - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				child.base,
				'swapChildTag - parent1.base'
			);

			toggleMaybeNull();
			rerender();

			expect(scratch.innerHTML).to.equal(
				[div('maybe'), span('child')].join('')
			);
			expect(maybe.base).to.equalNode(
				scratch.firstChild,
				'toggleMaybe - maybe.base'
			);
			expect(child.base).to.equalNode(
				scratch.lastChild,
				'toggleMaybe - child.base'
			);
			expect(parent2.base).to.equalNode(
				child.base,
				'toggleMaybe - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				maybe.base,
				'toggleMaybe - parent1.base'
			);
		});

		it('should update parent c.base if first non-null child becomes null with multiple null siblings', () => {
			render(
				<Parent1>
					<Null />
					<Null />
					<Parent2>
						<MaybeNull active />
						<Child />
					</Parent2>
				</Parent1>,
				scratch
			);

			expect(scratch.innerHTML).to.equal([div('maybe'), p('child')].join(''));
			expect(maybe.base).to.equalNode(
				scratch.firstChild,
				'initial - maybe.base'
			);
			expect(child.base).to.equalNode(
				scratch.lastChild,
				'initial - child.base'
			);
			expect(parent2.base).to.equalNode(maybe.base, 'initial - parent2.base');
			expect(parent1.base).to.equalNode(maybe.base, 'initial - parent1.base');

			toggleMaybeNull();
			rerender();

			expect(scratch.innerHTML).to.equal(p('child'));
			expect(maybe.base).to.equalNode(null, 'toggleMaybe - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'toggleMaybe - child.base'
			);
			expect(parent2.base).to.equalNode(
				child.base,
				'toggleMaybe - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				child.base,
				'toggleMaybe - parent1.base'
			);

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal(span('child'));
			expect(maybe.base).to.equalNode(null, 'swapChildTag - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'swapChildTag - child.base'
			);
			expect(parent2.base).to.equalNode(
				child.base,
				'swapChildTag - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				child.base,
				'swapChildTag - parent1.base'
			);
		});

		it('should update parent c.base if a null child returns DOM with multiple null siblings', () => {
			render(
				<Parent1>
					<Null />
					<Null />
					<Parent2>
						<MaybeNull />
						<Child />
					</Parent2>
				</Parent1>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(p('child'));
			expect(maybe.base).to.equalNode(null, 'initial - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'initial - child.base'
			);
			expect(parent2.base).to.equalNode(child.base, 'initial - parent2.base');
			expect(parent1.base).to.equalNode(child.base, 'initial - parent1.base');

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal(span('child'));
			expect(maybe.base).to.equalNode(null, 'swapChildTag - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'swapChildTag - child.base'
			);
			expect(parent2.base).to.equalNode(
				child.base,
				'swapChildTag - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				child.base,
				'swapChildTag - parent1.base'
			);

			toggleMaybeNull();
			rerender();

			expect(scratch.innerHTML).to.equal(
				[div('maybe'), span('child')].join('')
			);
			expect(maybe.base).to.equalNode(
				scratch.firstChild,
				'toggleMaybe - maybe.base'
			);
			expect(child.base).to.equalNode(
				scratch.lastChild,
				'toggleMaybe - child.base'
			);
			expect(parent2.base).to.equalNode(
				maybe.base,
				'toggleMaybe - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				maybe.base,
				'toggleMaybe - parent1.base'
			);
		});

		it('should update parent c.base to null if last child becomes null', () => {
			let fragRef = {};
			render(
				<Fragment ref={fragRef}>
					<Parent1>
						<Null />
						<Null />
						<Parent2>
							<MaybeNull active />
						</Parent2>
						<Null />
					</Parent1>
					<Child />
				</Fragment>,
				scratch
			);

			expect(scratch.innerHTML).to.equal([div('maybe'), p('child')].join(''));
			expect(maybe.base).to.equalNode(
				scratch.firstChild,
				'initial - maybe.base'
			);
			expect(child.base).to.equalNode(
				scratch.lastChild,
				'initial - child.base'
			);
			expect(parent2.base).to.equalNode(maybe.base, 'initial - parent2.base');
			expect(parent1.base).to.equalNode(maybe.base, 'initial - parent1.base');
			expect(fragRef.current.base).to.equalNode(
				maybe.base,
				'initial - fragRef.current.base'
			);

			toggleMaybeNull();
			rerender();

			expect(scratch.innerHTML).to.equal(p('child'));
			expect(maybe.base).to.equalNode(null, 'toggleMaybe - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'toggleMaybe - child.base'
			);
			expect(parent2.base).to.equalNode(
				maybe.base,
				'toggleMaybe - parent2.base'
			);
			expect(parent1.base).to.equalNode(
				maybe.base,
				'toggleMaybe - parent1.base'
			);
			expect(fragRef.current.base).to.equalNode(
				child.base,
				'toggleMaybe - fragRef.current.base'
			);
		});

		it('should update parent c.base if last child returns dom', () => {
			let fragRef = {};
			render(
				<Fragment ref={fragRef}>
					<Parent1>
						<Null />
						<Null />
						<Parent2>
							<MaybeNull />
						</Parent2>
						<Null />
					</Parent1>
					<Child />
				</Fragment>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(p('child'));
			expect(maybe.base).to.equalNode(null, 'initial - maybe.base');
			expect(child.base).to.equalNode(
				scratch.firstChild,
				'initial - child.base'
			);
			expect(parent2.base).to.equalNode(maybe.base, 'initial - parent2.base');
			expect(parent1.base).to.equalNode(maybe.base, 'initial - parent1.base');
			expect(fragRef.current.base).to.equalNode(
				child.base,
				'initial - fragRef.current.base'
			);

			toggleMaybeNull();
			rerender();

			expect(scratch.innerHTML).to.equal([div('maybe'), p('child')].join(''));
			expect(maybe.base).to.equalNode(
				scratch.firstChild,
				'toggleMaybe - maybe.base'
			);
			expect(child.base).to.equalNode(
				scratch.lastChild,
				'toggleMaybe - child.base'
			);
			expect(parent2.base).to.equalNode(maybe.base, 'initial - parent2.base');
			expect(parent1.base).to.equalNode(
				maybe.base,
				'toggleMaybe - parent1.base'
			);
			expect(fragRef.current.base).to.equalNode(
				maybe.base,
				'toggleMaybe - fragRef.current.base'
			);
		});

		it('should not update parent if it is a DOM node', () => {
			let divVNode = (
				<div>
					<Child />
				</div>
			);
			render(divVNode, scratch);

			// TODO: Consider rewriting test to not rely on internal properties
			// and instead capture user-facing bug that would occur if this
			// behavior were broken
			const domProp = '__e' in divVNode ? '__e' : '_dom';

			expect(scratch.innerHTML).to.equal('<div><p>child</p></div>');
			expect(divVNode[domProp]).to.equalNode(
				scratch.firstChild,
				'initial - divVNode._dom'
			);
			expect(child.base).to.equalNode(
				scratch.firstChild.firstChild,
				'initial - child.base'
			);

			swapChildTag();
			rerender();

			expect(scratch.innerHTML).to.equal('<div><span>child</span></div>');
			expect(divVNode[domProp]).to.equalNode(
				scratch.firstChild,
				'swapChildTag - divVNode._dom'
			);
			expect(child.base).to.equalNode(
				scratch.firstChild.firstChild,
				'swapChildTag - child.base'
			);
		});
	});

	describe('setState', () => {
		it('should not error if called on an unmounted component', () => {
			/** @type {() => void} */
			let increment;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = { count: 0 };
					increment = () => this.setState({ count: this.state.count + 1 });
				}
				render(props, state) {
					return <div>{state.count}</div>;
				}
			}

			render(<Foo />, scratch);
			expect(scratch.innerHTML).to.equal('<div>0</div>');

			increment();
			rerender();
			expect(scratch.innerHTML).to.equal('<div>1</div>');

			render(null, scratch);
			expect(scratch.innerHTML).to.equal('');

			expect(() => increment()).to.not.throw();
			expect(() => rerender()).to.not.throw();
			expect(scratch.innerHTML).to.equal('');
		});

		it('setState callbacks should have latest state, even when called in render', () => {
			let callbackState;
			let i = 0;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = { foo: 'bar' };
				}
				render() {
					// So we don't get infinite loop
					if (i++ === 0) {
						this.setState({ foo: 'baz' }, () => {
							callbackState = this.state;
						});
					}
					return String(this.state.foo);
				}
			}

			render(<Foo />, scratch);
			expect(scratch.innerHTML).to.equal('bar');

			rerender();
			expect(scratch.innerHTML).to.equal('baz');
			expect(callbackState).to.deep.equal({ foo: 'baz' });
		});
	});

	describe('forceUpdate', () => {
		it('should not error if called on an unmounted component', () => {
			/** @type {() => void} */
			let forceUpdate;

			class Foo extends Component {
				constructor(props) {
					super(props);
					forceUpdate = () => this.forceUpdate();
				}
				render(props, state) {
					return <div>Hello</div>;
				}
			}

			render(<Foo />, scratch);
			expect(scratch.innerHTML).to.equal('<div>Hello</div>');

			render(null, scratch);
			expect(scratch.innerHTML).to.equal('');

			expect(() => forceUpdate()).to.not.throw();
			expect(() => rerender()).to.not.throw();
			expect(scratch.innerHTML).to.equal('');
		});

		it('should update old dom on forceUpdate in a lifecycle', () => {
			let i = 0;
			class App extends Component {
				componentWillReceiveProps() {
					this.forceUpdate();
				}
				render() {
					if (i++ == 0) return <div>foo</div>;
					return <div>bar</div>;
				}
			}

			render(<App />, scratch);
			render(<App />, scratch);

			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});
	});
});
