import { h, render, Component } from '../../src/preact';
/** @jsx h */

const Empty = () => null;

describe('state', () => {
	let scratch;

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		let c = scratch.firstElementChild;
		if (c) render(<Empty />, scratch, c);
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	it('setState is asynchronous', (done) => {
		let putState;
		let getState;

		class Async extends Component {
			constructor(props) {
				super(props);
				this.state = { test:false };
				putState = this.putState = this.putState.bind(this);
				getState = this.getState = this.getState.bind(this);
			}
			putState() {
				this.setState({ test:true });
			}
			getState() {
				return this.state;
			}
			render() {
				return (
					<div></div>
				);
			}
		}
		render(<Async />, scratch);
		expect(getState().test).to.equal(false);
		putState();
		expect(getState().test).to.equal(false);
		setTimeout(() => { // setState is not synchronous
			expect(getState().test).to.equal(true);
			done();
		});
	});

	it('after setState, should only set state once, not set then unset for lifecycle methods then set again', (done) => { // kvndy
		let instance;

		class Inner extends Component {
			constructor(props) {
				super(props);
				this._privateState = props;
				Object.defineProperty(this, 'state', {
					get: this._getPrivateState,
					set: this._setPrivateState,
					enumerable: true,
					configurable: false
				});
			}
			_setPrivateState(state) {
				this._privateState = state;
			}
			_getPrivateState() {
				return this._privateState;
			}
			render(props) {
				return <div {...props} />;
			}
		}

		class Outer extends Component {
			constructor() {
				super();
				this.state = { value: 0 };
			}
			componentDidUpdate() {
				expect(Inner.prototype._setPrivateState).to.have.been.calledTwice;
				done();
			}
			render(_,state) {
				return (
					<Inner {...state} />
				);
			}
		}
		sinon.spy(Inner.prototype, '_setPrivateState');
		render(<Outer ref={c=>instance=c} />, scratch);
		instance.setState({ value: instance.state.value + 1 });
	});

	it('after forced render, should only set state once, not set then unset for lifecycle methods then set again', () => { // kvndy
		let instance;

		class Inner extends Component {
			constructor(props) {
				super(props);
				this._privateProps = props;
				Object.defineProperty(this, 'state', {
					get: this._getPrivateState,
					set: this._setPrivateState,
					enumerable: true,
					configurable: false
				});
			}
			_setPrivateState(state) {
				this._privateState = state;
			}
			_getPrivateState() {
				return this._privateState;
			}
			render(props) {
				return <div {...props} />;
			}
		}

		class Outer extends Component {
			constructor() {
				super();
				this.state = { value: 0 };
			}
			render(_,state) {
				return (
					<Inner {...state} />
				);
			}
		}

		sinon.spy(Inner.prototype, '_setPrivateState');
		render(<Outer ref={c=>instance=c} />, scratch);

		instance.setState({ value: instance.state.value + 1 });
		instance.forceUpdate();

		expect(Inner.prototype._setPrivateState).to.have.been.calledTwice;
	});

});
