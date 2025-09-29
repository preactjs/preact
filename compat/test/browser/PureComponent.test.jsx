import React, { createElement } from 'preact/compat';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { vi } from 'vitest';

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
		let spy = vi.fn();
		class Foo extends React.PureComponent {
			constructor(props) {
				super(props);
				spy(this.props, props);
			}
		}

		React.render(<Foo foo="bar" />, scratch);

		let expected = { foo: 'bar' };
		expect(spy).toHaveBeenCalledWith(expected, expected);
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

		vi.spyOn(Foo.prototype, 'render');

		const PROPS = { foo: 'bar' };
		React.render(<Foo {...PROPS} />, scratch);

		expect(Foo.prototype.render).toHaveBeenCalledOnce();
		expect(Foo.prototype.render).toHaveBeenCalledWith(PROPS, {}, {});
		expect(Foo.prototype.render).toHaveReturned({ type: 'div', props: PROPS });
		expect(instance.props).to.deep.equal(PROPS);
		expect(instance.state).to.deep.equal({});
		expect(instance.context).to.deep.equal({});

		expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
	});

	it('should ignore the __source variable', () => {
		const pureSpy = vi.fn();
		const appSpy = vi.fn();
		/** @type {(v) => void} */
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
		expect(appSpy).toHaveBeenCalledOnce();
		expect(pureSpy).toHaveBeenCalledOnce();

		set(1);
		rerender();
		expect(appSpy).toHaveBeenCalledTimes(2);
		expect(pureSpy).toHaveBeenCalledOnce();
	});

	it('should only re-render when props or state change', () => {
		class C extends React.PureComponent {
			render() {
				return <div />;
			}
		}
		let spy = vi.spyOn(C.prototype, 'render');

		let inst = React.render(<C />, scratch);
		expect(spy).toHaveBeenCalledOnce();
		spy.mockClear();

		inst = React.render(<C />, scratch);
		expect(spy).not.toHaveBeenCalled();

		let b = { foo: 'bar' };
		inst = React.render(<C a="a" b={b} />, scratch);
		expect(spy).toHaveBeenCalledOnce();
		spy.mockClear();

		inst = React.render(<C a="a" b={b} />, scratch);
		expect(spy).not.toHaveBeenCalled();

		inst.setState({});
		rerender();
		expect(spy).not.toHaveBeenCalled();

		inst.setState({ a: 'a', b });
		rerender();
		expect(spy).toHaveBeenCalledOnce();
		spy.mockClear();

		inst.setState({ a: 'a', b });
		rerender();
		expect(spy).not.toHaveBeenCalled();
	});

	it('should update when props are removed', () => {
		let spy = vi.fn();
		class App extends React.PureComponent {
			render() {
				spy();
				return <div>foo</div>;
			}
		}

		React.render(<App a="foo" />, scratch);
		React.render(<App />, scratch);
		expect(spy).toHaveBeenCalledTimes(2);
	});

	it('should have "isPureReactComponent" property', () => {
		let Pure = new React.PureComponent();
		expect(Pure.isReactComponent).to.deep.equal({});
	});
});
