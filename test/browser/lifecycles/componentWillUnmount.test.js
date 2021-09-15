import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';

/** @jsx createElement */

describe('Lifecycle methods', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('top-level componentWillUnmount', () => {
		it('should invoke componentWillUnmount for top-level components', () => {
			class Foo extends Component {
				componentDidMount() {}
				componentWillUnmount() {}
				render() {
					return 'foo';
				}
			}
			class Bar extends Component {
				componentDidMount() {}
				componentWillUnmount() {}
				render() {
					return 'bar';
				}
			}
			sinon.spy(Foo.prototype, 'componentDidMount');
			sinon.spy(Foo.prototype, 'componentWillUnmount');
			sinon.spy(Foo.prototype, 'render');

			sinon.spy(Bar.prototype, 'componentDidMount');
			sinon.spy(Bar.prototype, 'componentWillUnmount');
			sinon.spy(Bar.prototype, 'render');

			render(<Foo />, scratch);
			expect(Foo.prototype.componentDidMount, 'initial render').to.have.been
				.calledOnce;

			render(<Bar />, scratch);
			expect(Foo.prototype.componentWillUnmount, 'when replaced').to.have.been
				.calledOnce;
			expect(Bar.prototype.componentDidMount, 'when replaced').to.have.been
				.calledOnce;

			render(<div />, scratch);
			expect(Bar.prototype.componentWillUnmount, 'when removed').to.have.been
				.calledOnce;
		});

		it('should only remove dom after componentWillUnmount was called', () => {
			class Foo extends Component {
				componentWillUnmount() {
					expect(document.getElementById('foo')).to.not.equal(null);
				}

				render() {
					return <div id="foo" />;
				}
			}

			render(<Foo />, scratch);
			render(null, scratch);
		});
	});
});
