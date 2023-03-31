import { h, createElement, render, hydrate, Fragment } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */
/** @jsxFrag Fragment */

const COMMENT = '!--';

describe('keys', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should not render comments', () => {
		render(h(COMMENT, null, 'test'), scratch);
		expect(scratch.innerHTML).to.equal('<!--test-->');
	});

	it('should render comments in elements', () => {
		render(<div>{h(COMMENT, null, 'test')}</div>, scratch);
		expect(scratch.innerHTML).to.equal('<div><!--test--></div>');
	});

	it('should render Components that return comments', () => {
		function App() {
			return h(COMMENT, null, 'test');
		}
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<!--test-->');
	});

	it('should render Fragments that wrap comments', () => {
		function App() {
			return <Fragment>{h(COMMENT, null, 'test')}</Fragment>;
		}
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<!--test-->');
	});

	it('should render components that use comments to delimit start and end of a component', () => {
		function App() {
			return (
				<div>
					{h(COMMENT, null, 'start')}
					<div>test</div>
					{h(COMMENT, null, 'end')}
				</div>
			);
		}
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><!--start--><div>test</div><!--end--></div>'
		);
	});

	it('should render components that use comments to delimit start and end of a component with a Fragment', () => {
		function App() {
			return (
				<Fragment>
					{h(COMMENT, null, 'start')}
					<div>test</div>
					{h(COMMENT, null, 'end')}
				</Fragment>
			);
		}
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<!--start--><div>test</div><!--end-->');
	});

	it('should move comments to the correct location when moving a component', () => {
		function Child() {
			return (
				<>
					{h(COMMENT, null, 'start')}
					<div>test</div>
					{h(COMMENT, null, 'end')}
				</>
			);
		}

		/** @type {(props: { move?: boolean }) => any} */
		function App({ move = false }) {
			if (move) {
				return [
					<div key="a">a</div>,
					<Child key="child" />,
					<div key="b">b</div>
				];
			}

			return [
				<Child key="child" />,
				<div key="a">a</div>,
				<div key="b">b</div>
			];
		}

		const childHTML = '<!--start--><div>test</div><!--end-->';

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(`${childHTML}<div>a</div><div>b</div>`);

		render(<App move />, scratch);
		expect(scratch.innerHTML).to.equal(`<div>a</div>${childHTML}<div>b</div>`);

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(`${childHTML}<div>a</div><div>b</div>`);
	});

	it('should correctly show hide DOM around comments', () => {
		function App({ show = false }) {
			return (
				<>
					{h(COMMENT, null, 'start')}
					{show && <div>test</div>}
					{h(COMMENT, null, 'end')}
				</>
			);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<!--start--><!--end-->');

		render(<App show />, scratch);
		expect(scratch.innerHTML).to.equal('<!--start--><div>test</div><!--end-->');

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<!--start--><!--end-->');
	});

	it('should hydrate comments VNodes', () => {
		scratch.innerHTML = '<div><!--test--></div>';
		hydrate(<div>{h(COMMENT, null, 'test')}</div>, scratch);
		expect(scratch.innerHTML).to.equal('<div><!--test--></div>');
	});
});
