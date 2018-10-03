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
});
