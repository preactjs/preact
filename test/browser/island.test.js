import { setupRerender } from 'preact/test-utils';
import { createElement, hydrate, Component, Fragment } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('preact-island', () => {
	let scratch;
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should block hydration', () => {
		scratch.innerHTML = `<preact-island><p>foo</p></preact-island>`;

		const spy = sinon.spy();
		function Inner() {
			spy();
			return <p>foo</p>;
		}

		function App() {
			return (
				<preact-island>
					<Inner />
				</preact-island>
			);
		}

		hydrate(<App />, scratch);
		expect(spy).not.to.be.called;
		expect(scratch.innerHTML).to.equal(
			`<preact-island><p>foo</p></preact-island>`
		);
	});

	it('should block hydration in middle of children', () => {
		scratch.innerHTML = `<p>bar</p><preact-island><p>foo</p></preact-island><p>bar</p>`;

		const spy = sinon.spy();
		function Inner() {
			spy();
			return <p>foo</p>;
		}

		const barSpy = sinon.spy();
		function Bar() {
			barSpy();
			return <p>bar</p>;
		}

		function App() {
			return (
				<Fragment>
					<Bar />
					<preact-island>
						<Inner />
					</preact-island>
					<Bar />
				</Fragment>
			);
		}

		hydrate(<App />, scratch);
		expect(spy).not.to.be.called;
		expect(barSpy).to.be.calledTwice;
		expect(scratch.innerHTML).to.equal(
			`<p>bar</p><preact-island><p>foo</p></preact-island><p>bar</p>`
		);
	});

	it('should activate hydration', () => {
		scratch.innerHTML = `<preact-island><p>foo</p></preact-island>`;

		const spy = sinon.spy();
		function Inner() {
			spy();
			return <p>foo</p>;
		}

		function App() {
			return (
				<preact-island hydrate>
					<Inner />
				</preact-island>
			);
		}

		hydrate(<App />, scratch);
		expect(spy).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal(
			`<preact-island><p>foo</p></preact-island>`
		);
	});

	it('should ignore hydrate prop once hydrated', () => {
		scratch.innerHTML = `<preact-island><p>foo</p></preact-island>`;

		const spy = sinon.spy();
		function Inner() {
			spy();
			return <p>foo</p>;
		}

		/** @type {(obj: Record<string, any>) => void} */
		let update;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { hydrate: true };
				update = this.setState.bind(this);
			}
			render() {
				return (
					<preact-island hydrate={this.state.hydrate}>
						<Inner />
					</preact-island>
				);
			}
		}

		hydrate(<App />, scratch);
		expect(spy).to.be.calledOnce;

		// Should ignore `hydrate=false` once hydrated
		update({ hydrate: false });
		rerender();
		expect(spy).to.be.calledTwice;
	});
});
