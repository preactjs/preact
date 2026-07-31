import {
	createElement,
	render,
	createPortal,
	Component,
	Fragment
} from 'preact';
import { setupScratch, teardown } from '../_util/helpers';
import { setupRerender, act } from 'preact/test-utils';
import { expect } from 'chai';
import { vi } from 'vitest';

/* eslint-disable react/jsx-boolean-value, react/display-name, prefer-arrow-callback */

describe('createPortal', () => {
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

		root.parentNode.removeChild(root);
	});

	it('should insert the portal', () => {
		/** @type {() => void} */
		let setFalse;
		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = { mounted: true };
				setFalse = () => this.setState({ mounted: false });
			}
			render(props, state) {
				return (
					<div>
						<p>Hello</p>
						{state.mounted && createPortal(props.children, scratch)}
					</div>
				);
			}
		}
		render(<Foo>foobar</Foo>, scratch);
		expect(scratch.innerHTML).to.equal('foobar<div><p>Hello</p></div>');

		setFalse();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');
	});

	it('should order portal children well', () => {
		/** @type {() => void} */
		let bump;

		class Modal extends Component {
			constructor(props) {
				super(props);
				this.state = { top: false };
				bump = () => this.setState({ top: true });
			}
			render(props, state) {
				return (
					<Fragment>
						{state.top && <div>top</div>}
						<div>middle</div>
						<div>bottom</div>
					</Fragment>
				);
			}
		}

		function Foo(props) {
			return createPortal(<Modal />, scratch);
		}
		render(<Foo />, scratch);
		expect(scratch.innerHTML).to.equal('<div>middle</div><div>bottom</div>');

		bump();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div>top</div><div>middle</div><div>bottom</div>'
		);
	});

	it('should toggle the portal', () => {
		/** @type {() => void} */
		let toggle;

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = { mounted: true };
				toggle = () => this.setState(s => ({ mounted: !s.mounted }));
			}
			render(props, state) {
				return (
					<div>
						<p>Hello</p>
						{state.mounted && createPortal(props.children, scratch)}
					</div>
				);
			}
		}

		render(
			<Foo>
				<div>foobar</div>
			</Foo>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<div>foobar</div><div><p>Hello</p></div>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div>foobar</div>'
		);
	});

	it('should notice prop changes on the portal', () => {
		/** @type {(c) => void} */
		let set;

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = {
					additionalProps: { style: { backgroundColor: 'red' } }
				};
				set = c => this.setState({ additionalProps: c });
			}
			render(props, state) {
				return (
					<div>
						<p>Hello</p>
						{createPortal(<p {...state.additionalProps}>Foo</p>, scratch)}
					</div>
				);
			}
		}

		render(<Foo />, scratch);
		expect(scratch.firstChild.style.backgroundColor).to.equal('red');

		set({});
		rerender();
		expect(scratch.firstChild.style.backgroundColor).to.equal('');
	});

	it('should not unmount the portal component', () => {
		let spy = vi.fn();
		/** @type {(c) => void} */
		let set;
		class Child extends Component {
			componentWillUnmount() {
				spy();
			}

			render(props) {
				return props.children;
			}
		}

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = {
					additionalProps: { style: { background: 'red' } }
				};
				set = c => this.setState({ additionalProps: c });
			}
			render(props, state) {
				return (
					<div>
						<p>Hello</p>
						{createPortal(
							<Child {...state.additionalProps}>Foo</Child>,
							scratch
						)}
					</div>
				);
			}
		}

		render(<Foo />, scratch);
		expect(spy).not.toHaveBeenCalled();

		set({});
		rerender();
		expect(spy).not.toHaveBeenCalled();
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
			return <div>{createPortal(<Dialog />, dialog)}</div>;
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
			return <div>{createPortal(<Dialog />, dialog)}</div>;
		}

		render(<App />, root);
		expect(dialog.childNodes.length).to.equal(1);
		render(null, root);
		expect(dialog.childNodes.length).to.equal(0);
	});

	it('should leave a working root after the portal', () => {
		/** @type {() => void} */
		let toggle,
			/** @type {() => void} */
			toggle2;

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = { mounted: false, mounted2: true };
				toggle = () => this.setState(s => ({ mounted: !s.mounted }));
				toggle2 = () => this.setState(s => ({ mounted2: !s.mounted2 }));
			}
			render(props, state) {
				return (
					<div>
						{state.mounted && createPortal(props.children, scratch)}
						{state.mounted2 && <p>Hello</p>}
					</div>
				);
			}
		}

		render(
			<Foo>
				<div>foobar</div>
			</Foo>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div>foobar</div>'
		);

		toggle2();
		rerender();
		expect(scratch.innerHTML).to.equal('<div></div><div>foobar</div>');

		toggle2();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div>foobar</div>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');

		toggle2();
		rerender();
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	it('should work with stacking portals', () => {
		/** @type {() => void} */
		let toggle,
			/** @type {() => void} */
			toggle2;

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = { mounted: false, mounted2: false };
				toggle = () => this.setState(s => ({ mounted: !s.mounted }));
				toggle2 = () => this.setState(s => ({ mounted2: !s.mounted2 }));
			}
			render(props, state) {
				return (
					<div>
						<p>Hello</p>
						{state.mounted && createPortal(props.children, scratch)}
						{state.mounted2 && createPortal(props.children2, scratch)}
					</div>
				);
			}
		}

		render(
			<Foo children2={<div>foobar2</div>}>
				<div>foobar</div>
			</Foo>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div>foobar</div>'
		);

		toggle2();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div>foobar</div><div>foobar2</div>'
		);

		toggle2();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div>foobar</div>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');
	});

	it('should work with changing the container', () => {
		/** @type {(c) => void} */
		let set, ref;

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = { container: scratch };
				set = c => this.setState({ container: c });
			}
			render(props, state) {
				return (
					<div
						ref={r => {
							ref = r;
						}}
					>
						<p>Hello</p>
						{createPortal(props.children, state.container)}
					</div>
				);
			}
		}

		render(
			<Foo>
				<div>foobar</div>
			</Foo>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<div>foobar</div><div><p>Hello</p></div>'
		);

		set(ref);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p><div>foobar</div></div>'
		);
	});

	it('should work with replacing placeholder portals', () => {
		/** @type {() => void} */
		let toggle,
			/** @type {() => void} */
			toggle2;

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = { mounted: false, mounted2: false };
				toggle = () => this.setState(s => ({ mounted: !s.mounted }));
				toggle2 = () => this.setState(s => ({ mounted2: !s.mounted2 }));
			}
			render(props, state) {
				return (
					<div>
						<p>Hello</p>
						{createPortal(state.mounted && props.children, scratch)}
						{createPortal(state.mounted2 && props.children, scratch)}
					</div>
				);
			}
		}

		render(
			<Foo>
				<div>foobar</div>
			</Foo>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div>foobar</div>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');

		toggle2();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div>foobar</div>'
		);

		toggle2();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');
	});

	it('should work with removing an element from stacked container to new one', () => {
		/** @type {() => void} */
		let toggle, root2;

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = { root: scratch };
				toggle = () => this.setState({ root: root2 });
			}
			render(props, state) {
				return (
					<div
						ref={r => {
							root2 = r;
						}}
					>
						<p>Hello</p>
						{createPortal(props.children, scratch)}
						{createPortal(props.children, state.root)}
					</div>
				);
			}
		}

		render(
			<Foo>
				<div>foobar</div>
			</Foo>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<div>foobar</div><div>foobar</div><div><p>Hello</p></div>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div>foobar</div><div><p>Hello</p><div>foobar</div></div>'
		);
	});

	it('should support nested portals', () => {
		/** @type {() => void} */
		let toggle,
			/** @type {() => void} */
			toggle2,
			inner;

		class Bar extends Component {
			constructor(props) {
				super(props);
				this.state = { mounted: false };
				toggle2 = () => this.setState(s => ({ mounted: !s.mounted }));
			}
			render(props, state) {
				return (
					<div
						ref={r => {
							inner = r;
						}}
					>
						<p>Inner</p>
						{state.mounted && createPortal(<p>hiFromBar</p>, scratch)}
						{state.mounted && createPortal(<p>innerPortal</p>, inner)}
					</div>
				);
			}
		}

		class Foo extends Component {
			constructor(props) {
				super(props);
				this.state = { mounted: false };
				toggle = () => this.setState(s => ({ mounted: !s.mounted }));
			}
			render(props, state) {
				return (
					<div>
						<p>Hello</p>
						{state.mounted && createPortal(<Bar />, scratch)}
					</div>
				);
			}
		}

		render(<Foo />, scratch);
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div><p>Inner</p></div>'
		);

		toggle2();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><p>Hello</p></div><div><p>Inner</p><p>innerPortal</p></div><p>hiFromBar</p>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Hello</p></div>');
	});

	it('should support nested portals remounting #2669', () => {
		let setVisible;
		let i = 0;

		function PortalComponent(props) {
			const innerVnode = <div id="inner">{i}</div>;
			innerVnode.___id = 'inner_' + i++;
			const outerVnode = (
				<div id="outer">
					{i}
					{props.show && createPortal(innerVnode, scratch)}
				</div>
			);
			outerVnode.___id = 'outer_' + i++;
			return createPortal(outerVnode, scratch);
		}

		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { visible: true };
				setVisible = visible => this.setState({ visible });
			}
			render(props, state) {
				return (
					<div id="app">
						test
						<PortalComponent show={state.visible} />
					</div>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="inner">0</div><div id="outer">1</div><div id="app">test</div>'
		);

		act(() => {
			setVisible(false);
		});
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div id="outer">3</div><div id="app">test</div>'
		);

		act(() => {
			setVisible(true);
		});
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div id="outer">5</div><div id="app">test</div><div id="inner">4</div>'
		);

		act(() => {
			setVisible(false);
		});
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div id="outer">7</div><div id="app">test</div>'
		);
	});

	it('should not unmount when parent renders', () => {
		let root = document.createElement('div');
		let dialog = document.createElement('div');
		dialog.id = 'container';

		scratch.appendChild(root);
		scratch.appendChild(dialog);

		let spy = vi.fn();
		class Child extends Component {
			componentDidMount() {
				spy();
			}

			render() {
				return <div id="child">child</div>;
			}
		}

		let spyParent = vi.fn();
		class App extends Component {
			componentDidMount() {
				spyParent();
			}
			render() {
				return <div>{createPortal(<Child />, dialog)}</div>;
			}
		}

		render(<App />, root);
		let dom = document.getElementById('child');
		expect(spyParent).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledOnce();

		// Render twice to trigger update scenario
		render(<App />, root);
		render(<App />, root);

		let domNew = document.getElementById('child');
		expect(dom).to.equal(domNew);
		expect(spyParent).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledOnce();
	});

	it('should switch between non portal and portal node (Modal as lastChild)', () => {
		/** @type {() => void} */
		let toggle;
		const Modal = ({ children, open }) =>
			open ? createPortal(<div>{children}</div>, scratch) : <div>Closed</div>;

		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { open: false };
				toggle = () => this.setState(s => ({ open: !s.open }));
			}
			render(props, state) {
				return (
					<div>
						<button onClick={toggle}>Show</button>
						{state.open ? 'Open' : 'Closed'}
						<Modal open={state.open}>Hello</Modal>
					</div>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><button>Show</button>Closed<div>Closed</div></div>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><button>Show</button>Open</div><div>Hello</div>'
		);
	});

	it('should switch between non portal and portal node (Modal as firstChild)', () => {
		/** @type {() => void} */
		let toggle;
		const Modal = ({ children, open }) =>
			open ? createPortal(<div>{children}</div>, scratch) : <div>Closed</div>;

		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { open: false };
				toggle = () => this.setState(s => ({ open: !s.open }));
			}
			render(props, state) {
				return (
					<div>
						<Modal open={state.open}>Hello</Modal>
						<button onClick={toggle}>Show</button>
						{state.open ? 'Open' : 'Closed'}
					</div>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><div>Closed</div><button>Show</button>Closed</div>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><button>Show</button>Open</div><div>Hello</div>'
		);

		toggle();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><div>Closed</div><button>Show</button>Closed</div>'
		);
	});

	// #4992
	it('should maintain SVG namespace when rendering through a portal', () => {
		const svgRoot = document.createElementNS(
			'http://www.w3.org/2000/svg',
			'svg'
		);
		document.body.appendChild(svgRoot);

		function App() {
			return (
				<svg>
					<g>
						<rect width="100" height="100" fill="red" />
						{createPortal(
							<g id="test-portal">
								<rect width="50" height="50" fill="blue" />
							</g>,
							svgRoot
						)}
					</g>
				</svg>
			);
		}

		render(<App />, scratch);

		const portalG = svgRoot.querySelector('g#test-portal');
		expect(portalG.namespaceURI).to.equal('http://www.w3.org/2000/svg');
		expect(portalG.constructor.name).to.equal('SVGGElement');

		svgRoot.parentNode.removeChild(svgRoot);
	});
});
