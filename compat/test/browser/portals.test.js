import { createElement as h, render, createPortal, useState } from '../../src';
import { setupScratch } from '../../../test/_util/helpers';
import { setupRerender, teardown } from 'preact/test-utils';
/* eslint-disable react/jsx-boolean-value, react/display-name, prefer-arrow-callback */

/** @jsx h */
describe('Portal', () => {

	/** @type {HTMLDivElement} */
	let scratch;
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
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
		let setFalse;
		function Foo(props) {
			const [mounted, setMounted] = useState(true);
			setFalse = () => setMounted(() => false);
			return (
				<div>
					<p>Hello</p>
					{mounted && createPortal(props.children, scratch)}
				</div>
			);
		}
		render(<Foo>foobar</Foo>, scratch);
		expect(scratch.innerHTML).to.equal('foobar<div><p>Hello</p></div>');

		setFalse();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');
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
		expect(dialog.childNodes.length).to.equal(1);
		render(null, root);
		expect(dialog.childNodes.length).to.equal(0);
	});
});
