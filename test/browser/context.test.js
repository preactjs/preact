import { createElement, render, Component, Fragment } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

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
		sinon.spy(Outer.prototype, 'getChildContext');

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
		sinon.spy(Inner.prototype, 'shouldComponentUpdate');
		sinon.spy(Inner.prototype, 'componentWillReceiveProps');
		sinon.spy(Inner.prototype, 'componentWillUpdate');
		sinon.spy(Inner.prototype, 'componentDidUpdate');
		sinon.spy(Inner.prototype, 'render');

		render(<Outer />, scratch);

		expect(Outer.prototype.getChildContext).to.have.been.calledOnce;

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWith({}, {}, CONTEXT);

		CONTEXT.foo = 'bar';
		render(<Outer {...PROPS} />, scratch);

		expect(Outer.prototype.getChildContext).to.have.been.calledTwice;

		expect(
			Inner.prototype.shouldComponentUpdate
		).to.have.been.calledOnce.and.calledWith(PROPS, {}, CONTEXT);
		expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledWith(
			PROPS,
			CONTEXT
		);
		expect(Inner.prototype.componentWillUpdate).to.have.been.calledWith(
			PROPS,
			{},
			CONTEXT
		);
		expect(Inner.prototype.componentDidUpdate).to.have.been.calledWith(
			{},
			{},
			undefined
		);
		expect(Inner.prototype.render).to.have.been.calledWith(PROPS, {}, CONTEXT);

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
		sinon.spy(Outer.prototype, 'getChildContext');

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
		sinon.spy(Inner.prototype, 'shouldComponentUpdate');
		sinon.spy(Inner.prototype, 'componentWillReceiveProps');
		sinon.spy(Inner.prototype, 'componentWillUpdate');
		sinon.spy(Inner.prototype, 'componentDidUpdate');
		sinon.spy(Inner.prototype, 'render');

		render(<Outer />, scratch);

		expect(Outer.prototype.getChildContext).to.have.been.calledOnce;

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWith({}, {}, CONTEXT);

		CONTEXT.foo = 'bar';
		render(<Outer {...PROPS} />, scratch);

		expect(Outer.prototype.getChildContext).to.have.been.calledTwice;

		expect(
			Inner.prototype.shouldComponentUpdate
		).to.have.been.calledOnce.and.calledWith(PROPS, {}, CONTEXT);
		expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledWith(
			PROPS,
			CONTEXT
		);
		expect(Inner.prototype.componentWillUpdate).to.have.been.calledWith(
			PROPS,
			{},
			CONTEXT
		);
		expect(Inner.prototype.componentDidUpdate).to.have.been.calledWith(
			{},
			{},
			undefined
		);
		expect(Inner.prototype.render).to.have.been.calledWith(PROPS, {}, CONTEXT);

		// make sure render() could make use of context.a
		expect(Inner.prototype.render).to.have.returned(
			sinon.match({ props: { children: 'a' } })
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

		sinon.spy(Inner.prototype, 'render');
		sinon.spy(InnerMost.prototype, 'render');

		render(<Outer />, scratch);

		expect(Inner.prototype.render).to.have.been.calledWith(
			{},
			{},
			{ outerContext }
		);
		expect(InnerMost.prototype.render).to.have.been.calledWith(
			{},
			{},
			{ outerContext, innerContext }
		);
	});

	it('should pass context through Fragments', () => {
		const context = { foo: 'bar' };

		const Foo = sinon.spy(() => <div />);

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
		expect(Foo.args[0][1]).to.deep.equal(context);
	});
});
