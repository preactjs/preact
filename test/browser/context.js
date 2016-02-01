import { h, render, Component } from '../../src/preact';
/** @jsx h */

describe('context', () => {
	let scratch;

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

		render(<Outer />, scratch, scratch.lastChild);

		expect(Outer.prototype.getChildContext).to.have.been.calledOnce;

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWith({}, {}, CONTEXT);

		CONTEXT.foo = 'bar';
		render(<Outer {...PROPS} />, scratch, scratch.lastChild);

		expect(Outer.prototype.getChildContext).to.have.been.calledTwice;

		expect(Inner.prototype.shouldComponentUpdate).to.have.been.calledOnce.and.calledWith(PROPS, {}, CONTEXT);
		expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledWith(PROPS, CONTEXT);
		expect(Inner.prototype.componentWillUpdate).to.have.been.calledWith(PROPS, {});
		expect(Inner.prototype.componentDidUpdate).to.have.been.calledWith({}, {});
		expect(Inner.prototype.render).to.have.been.calledWith(PROPS, {}, CONTEXT);
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

		render(<Outer />, scratch, scratch.lastChild);

		expect(Outer.prototype.getChildContext).to.have.been.calledOnce;

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWith({}, {}, CONTEXT);

		CONTEXT.foo = 'bar';
		render(<Outer {...PROPS} />, scratch, scratch.lastChild);

		expect(Outer.prototype.getChildContext).to.have.been.calledTwice;

		expect(Inner.prototype.shouldComponentUpdate).to.have.been.calledOnce.and.calledWith(PROPS, {}, CONTEXT);
		expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledWith(PROPS, CONTEXT);
		expect(Inner.prototype.componentWillUpdate).to.have.been.calledWith(PROPS, {});
		expect(Inner.prototype.componentDidUpdate).to.have.been.calledWith({}, {});
		expect(Inner.prototype.render).to.have.been.calledWith(PROPS, {}, CONTEXT);

		// make sure render() could make use of context.a
		expect(Inner.prototype.render).to.have.returned(sinon.match({ children:['a'] }));
	});
});
