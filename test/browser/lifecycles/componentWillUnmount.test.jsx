import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';
import { vi } from 'vitest';

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
			vi.spyOn(Foo.prototype, 'componentDidMount');
			vi.spyOn(Foo.prototype, 'componentWillUnmount');
			vi.spyOn(Foo.prototype, 'render');

			vi.spyOn(Bar.prototype, 'componentDidMount');
			vi.spyOn(Bar.prototype, 'componentWillUnmount');
			vi.spyOn(Bar.prototype, 'render');

			render(<Foo />, scratch);
			expect(Foo.prototype.componentDidMount).toHaveBeenCalledOnce();

			render(<Bar />, scratch);
			expect(Foo.prototype.componentWillUnmount).toHaveBeenCalledOnce();
			expect(Bar.prototype.componentDidMount).toHaveBeenCalledOnce();

			render(<div />, scratch);
			expect(Bar.prototype.componentWillUnmount).toHaveBeenCalledOnce();
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
