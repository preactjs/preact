import React, { createElement } from 'preact/compat';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('PureComponent', () => {
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

	it('should be a class', () => {
		expect(React).to.have.property('PureComponent').that.is.a('function');
	});

	it('should pass props in constructor', () => {
		let spy = sinon.spy();
		class Foo extends React.PureComponent {
			constructor(props) {
				super(props);
				spy(this.props, props);
			}
		}

		React.render(<Foo foo="bar" />, scratch);

		let expected = { foo: 'bar' };
		expect(spy).to.be.calledWithMatch(expected, expected);
	});

	it('should pass context in constructor', () => {
		let instance;
		// Not initializing state matches React behavior: https://codesandbox.io/s/rml19v8o2q
		class Foo extends React.PureComponent {
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

		const PROPS = { foo: 'bar' };
		React.render(<Foo {...PROPS} />, scratch);

		expect(Foo.prototype.render)
			.to.have.been.calledOnce.and.to.have.been.calledWithMatch(PROPS, {}, {})
			.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
		expect(instance.props).to.deep.equal(PROPS);
		expect(instance.state).to.deep.equal({});
		expect(instance.context).to.deep.equal({});

		expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
	});

	it('should ignore the __source variable', () => {
		const pureSpy = sinon.spy();
		const appSpy = sinon.spy();
		let set;
		class Pure extends React.PureComponent {
			render() {
				pureSpy();
				return <div>Static</div>;
			}
		}

		const App = () => {
			const [, setState] = React.useState(0);
			appSpy();
			set = setState;
			return <Pure __source={{}} />;
		};

		React.render(<App />, scratch);
		expect(appSpy).to.be.calledOnce;
		expect(pureSpy).to.be.calledOnce;

		set(1);
		rerender();
		expect(appSpy).to.be.calledTwice;
		expect(pureSpy).to.be.calledOnce;
	});

	it('should only re-render when props or state change', () => {
		class C extends React.PureComponent {
			render() {
				return <div />;
			}
		}
		let spy = sinon.spy(C.prototype, 'render');

		let inst = React.render(<C />, scratch);
		expect(spy).to.have.been.calledOnce;
		spy.resetHistory();

		inst = React.render(<C />, scratch);
		expect(spy).not.to.have.been.called;

		let b = { foo: 'bar' };
		inst = React.render(<C a="a" b={b} />, scratch);
		expect(spy).to.have.been.calledOnce;
		spy.resetHistory();

		inst = React.render(<C a="a" b={b} />, scratch);
		expect(spy).not.to.have.been.called;

		inst.setState({});
		rerender();
		expect(spy).not.to.have.been.called;

		inst.setState({ a: 'a', b });
		rerender();
		expect(spy).to.have.been.calledOnce;
		spy.resetHistory();

		inst.setState({ a: 'a', b });
		rerender();
		expect(spy).not.to.have.been.called;
	});

	it('should update when props are removed', () => {
		let spy = sinon.spy();
		class App extends React.PureComponent {
			render() {
				spy();
				return <div>foo</div>;
			}
		}

		React.render(<App a="foo" />, scratch);
		React.render(<App />, scratch);
		expect(spy).to.be.calledTwice;
	});

	it('should have "isPureReactComponent" property', () => {
		let Pure = new React.PureComponent();
		expect(Pure.isReactComponent).to.deep.equal({});
	});
});
