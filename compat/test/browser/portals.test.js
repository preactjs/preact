import { createElement as h, render, createPortal } from '../../src';
import { setupScratch, teardown } from '../../../test/_util/helpers';
/* eslint-disable react/jsx-boolean-value, react/display-name, prefer-arrow-callback */

/** @jsx h */
describe('Portal', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render into a different root node', () => {
		let root = document.createElement('div');
		document.body.appendChild(root);

		function Foo(props) {
			return <div>{createPortal(props.children, root)}</div>;
		}
		render(<Foo>foobar</Foo>, scratch);

		expect(root.innerHTML).to.equal('foobar');
	});

	it('should insert the portal', () => {
		function Foo(props) {
			return (
				<div>
					<p>Hello</p>
					{createPortal(props.children, scratch)}
				</div>
			);
		}
		render(<Foo>foobar</Foo>, scratch);
		expect(scratch.innerHTML).to.equal('foobar<div><p>Hello</p></div>');
	});

	it('should not render <undefined> for Portal nodes', () => {
		let root = document.createElement('div');
		let dialog = document.createElement('div');
		dialog.id = 'container';

		scratch.appendChild(root);
		scratch.appendChild(dialog);

		function Dialog() {
			return <div>Dialog content</div>;
		}

		function App() {
			return (
				<div>
					{createPortal(<Dialog />, dialog)}
				</div>
			);
		}

		render(<App />, root);
		expect(scratch.firstChild.firstChild.childNodes.length).to.equal(0);
	});

	it('should unmount Portal', () => {
		let root = document.createElement('div');
		let dialog = document.createElement('div');
		dialog.id = 'container';

		scratch.appendChild(root);
		scratch.appendChild(dialog);

		function Dialog() {
			return <div>Dialog content</div>;
		}

		function App() {
			return (
				<div>
					{createPortal(<Dialog />, dialog)}
				</div>
			);
		}

		render(<App />, root);
		expect(dialog.childNodes.length).to.equal(2);
		render(null, root);
		expect(dialog.childNodes.length).to.equal(0);
	});
});
