import { createElement, render, Component, Fragment } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';
import { vi } from 'vitest';

describe('context', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should pass context to grandchildren', () => {
		const CONTEXT = { a: 'a' };
		const PROPS = { b: 'b' };
		// let inner;

		class Outer extends Component {
			getChildContext() {
				return CONTEXT;
			}
			render(props) {
				return (
					<div>
						<Inner {...props} />
					</div>
				);
			}
		}
		vi.spyOn(Outer.prototype, 'getChildContext');

		class Inner extends Component {
			// constructor() {
			// 	super();
			// 	inner = this;
			// }
			shouldComponentUpdate() {
				return true;
			}
			componentWillReceiveProps() {}
			componentWillUpdate() {}
			componentDidUpdate() {}
			render(props, state, context) {
				return <div>{context && context.a}</div>;
			}
		}
		vi.spyOn(Inner.prototype, 'shouldComponentUpdate');
		vi.spyOn(Inner.prototype, 'componentWillReceiveProps');
		vi.spyOn(Inner.prototype, 'componentWillUpdate');
		vi.spyOn(Inner.prototype, 'componentDidUpdate');
		vi.spyOn(Inner.prototype, 'render');

		render(<Outer />, scratch);

		expect(Outer.prototype.getChildContext).toHaveBeenCalledTimes(1);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).toHaveBeenCalledWith({}, {}, CONTEXT);

		CONTEXT.foo = 'bar';
		render(<Outer {...PROPS} />, scratch);

		expect(Outer.prototype.getChildContext).toHaveBeenCalledTimes(2);

		expect(Inner.prototype.shouldComponentUpdate).toHaveBeenCalledTimes(1);
		expect(Inner.prototype.shouldComponentUpdate).toHaveBeenCalledWith(
			PROPS,
			{},
			CONTEXT
		);
		expect(Inner.prototype.componentWillReceiveProps).toHaveBeenCalledWith(
			PROPS,
			CONTEXT
		);
		expect(Inner.prototype.componentWillUpdate).toHaveBeenCalledWith(
			PROPS,
			{},
			CONTEXT
		);
		expect(Inner.prototype.componentDidUpdate).toHaveBeenCalledWith(
			{},
			{},
			undefined
		);
		expect(Inner.prototype.render).toHaveBeenCalledWith(PROPS, {}, CONTEXT);

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
		const CONTEXT = { a: 'a' };
		const PROPS = { b: 'b' };

		class Outer extends Component {
			getChildContext() {
				return CONTEXT;
			}
			render(props) {
				return <Inner {...props} />;
			}
		}
		vi.spyOn(Outer.prototype, 'getChildContext');

		class Inner extends Component {
			shouldComponentUpdate() {
				return true;
			}
			componentWillReceiveProps() {}
			componentWillUpdate() {}
			componentDidUpdate() {}
			render(props, state, context) {
				return <div>{context && context.a}</div>;
			}
		}
		vi.spyOn(Inner.prototype, 'shouldComponentUpdate');
		vi.spyOn(Inner.prototype, 'componentWillReceiveProps');
		vi.spyOn(Inner.prototype, 'componentWillUpdate');
		vi.spyOn(Inner.prototype, 'componentDidUpdate');
		vi.spyOn(Inner.prototype, 'render');

		render(<Outer />, scratch);

		expect(Outer.prototype.getChildContext).toHaveBeenCalledTimes(1);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).toHaveBeenCalledWith({}, {}, CONTEXT);

		CONTEXT.foo = 'bar';
		render(<Outer {...PROPS} />, scratch);

		expect(Outer.prototype.getChildContext).toHaveBeenCalledTimes(2);

		expect(Inner.prototype.shouldComponentUpdate).toHaveBeenCalledTimes(1);
		expect(Inner.prototype.shouldComponentUpdate).toHaveBeenCalledWith(
			PROPS,
			{},
			CONTEXT
		);
		expect(Inner.prototype.componentWillReceiveProps).toHaveBeenCalledWith(
			PROPS,
			CONTEXT
		);
		expect(Inner.prototype.componentWillUpdate).toHaveBeenCalledWith(
			PROPS,
			{},
			CONTEXT
		);
		expect(Inner.prototype.componentDidUpdate).toHaveBeenCalledWith(
			{},
			{},
			undefined
		);
		expect(Inner.prototype.render).toHaveBeenCalledWith(PROPS, {}, CONTEXT);

		// make sure render() could make use of context.a
		expect(Inner.prototype.render).toHaveReturned(
			expect.objectContaining({ props: { children: 'a' } })
		);
	});

	it('should preserve existing context properties when creating child contexts', () => {
		let outerContext = { outer: true },
			innerContext = { inner: true };
		class Outer extends Component {
			getChildContext() {
				return { outerContext };
			}
			render() {
				return (
					<div>
						<Inner />
					</div>
				);
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

		vi.spyOn(Inner.prototype, 'render');
		vi.spyOn(InnerMost.prototype, 'render');

		render(<Outer />, scratch);

		expect(Inner.prototype.render).toHaveBeenCalledWith(
			{},
			{},
			{ outerContext }
		);
		expect(InnerMost.prototype.render).toHaveBeenCalledWith(
			{},
			{},
			{ outerContext, innerContext }
		);
	});

	it('should pass context through Fragments', () => {
		const context = { foo: 'bar' };

		const Foo = vi.fn(() => <div />);

		class Wrapper extends Component {
			getChildContext() {
				return context;
			}

			render() {
				return (
					<Fragment>
						<Foo />
						<Foo />
					</Fragment>
				);
			}
		}

		render(<Wrapper />, scratch);
		expect(Foo.mock.calls[0][1]).to.deep.equal(context);
	});
});
