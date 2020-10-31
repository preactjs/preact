import { createElement, createRoot, Component } from 'preact';
import { setupScratch, teardown, spyAll } from '../../_util/helpers';

/** @jsx createElement */

describe('Lifecycle methods', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let render;

	beforeEach(() => {
		scratch = setupScratch();
		({ render } = createRoot(scratch));
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
			spyAll(Foo.prototype);
			spyAll(Bar.prototype);

			render(<Foo />);
			expect(Foo.prototype.componentDidMount, 'initial render').to.have.been
				.calledOnce;

			render(<Bar />);
			expect(Foo.prototype.componentWillUnmount, 'when replaced').to.have.been
				.calledOnce;
			expect(Bar.prototype.componentDidMount, 'when replaced').to.have.been
				.calledOnce;

			render(<div />);
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

			render(<Foo />);
			render(null);
		});
	});
});
