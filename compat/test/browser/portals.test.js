import React, {
	createElement,
	render,
	createPortal,
	useState,
	Component,
	useEffect,
	Fragment,
	useId
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { setupRerender, act } from 'preact/test-utils';
import { expect } from 'chai';
import { vi } from 'vitest';

/* eslint-disable react/jsx-boolean-value, react/display-name, prefer-arrow-callback */

describe('Portal', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	/** @type {HTMLDivElement} */
	let scratch2;

	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		scratch2 = setupScratch('scratch-2');
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
		teardown(scratch2);
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

	it('should order portal children well', () => {
		/** @type {() => void} */
		let bump;

		function Modal() {
			const [state, setState] = useState(0);
			bump = () => setState(() => 1);

			return (
				<Fragment>
					{state === 1 && <div>top</div>}
					<div>middle</div>
					<div>bottom</div>
				</Fragment>
			);
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

		function Foo(props) {
			const [mounted, setMounted] = useState(true);
			toggle = () => setMounted(s => !s);
			return (
				<div>
					<p>Hello</p>
					{mounted && createPortal(props.children, scratch)}
				</div>
			);
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

		function Foo(props) {
			const [additionalProps, setProps] = useState({
				style: { backgroundColor: 'red' }
			});
			set = c => setProps(c);
			return (
				<div>
					<p>Hello</p>
					{createPortal(<p {...additionalProps}>Foo</p>, scratch)}
				</div>
			);
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

		function Foo(props) {
			const [additionalProps, setProps] = useState({
				style: { background: 'red' }
			});
			set = c => setProps(c);
			return (
				<div>
					<p>Hello</p>
					{createPortal(<Child {...additionalProps}>Foo</Child>, scratch)}
				</div>
			);
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

	it('should have unique ids for each portal', () => {
		let root = document.createElement('div');
		let dialog = document.createElement('div');
		dialog.id = 'container';

		scratch.appendChild(root);
		scratch.appendChild(dialog);

		function Id() {
			const id = useId();
			return id;
		}

		function Dialog() {
			return <Id />;
		}

		function App() {
			return (
				<div>
					<Id />
					{createPortal(<Dialog />, dialog)}
				</div>
			);
		}

		render(<App />, root);
		expect(scratch.innerHTML).to.equal(
			'<div><div>P0-0</div></div><div id="container">P0-1</div>'
		);
	});

	it('should have unique ids for each portal, even when a new one shows up', () => {
		let root = document.createElement('div');
		let dialog = document.createElement('div');
		dialog.id = 'container';

		scratch.appendChild(root);
		scratch.appendChild(dialog);

		function Id() {
			const id = useId();
			return id;
		}

		function Dialog(props) {
			return <Id />;
		}

		function App(props) {
			return (
				<div>
					<Id />
					{createPortal(<Dialog />, dialog)}
					{props.renderPortal && createPortal(<Dialog />, dialog)}
				</div>
			);
		}

		render(<App />, root);
		expect(scratch.innerHTML).to.equal(
			'<div><div>P0-0</div></div><div id="container">P0-1</div>'
		);

		render(<App renderPortal={true} />, root);
		expect(scratch.innerHTML).to.equal(
			'<div><div>P0-0</div></div><div id="container">P0-1P0-2</div>'
		);
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

		function Foo(props) {
			const [mounted, setMounted] = useState(false);
			const [mounted2, setMounted2] = useState(true);
			toggle = () => setMounted(s => !s);
			toggle2 = () => setMounted2(s => !s);
			return (
				<div>
					{mounted && createPortal(props.children, scratch)}
					{mounted2 && <p>Hello</p>}
				</div>
			);
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

		function Foo(props) {
			const [mounted, setMounted] = useState(false);
			const [mounted2, setMounted2] = useState(false);
			toggle = () => setMounted(s => !s);
			toggle2 = () => setMounted2(s => !s);
			return (
				<div>
					<p>Hello</p>
					{mounted && createPortal(props.children, scratch)}
					{mounted2 && createPortal(props.children2, scratch)}
				</div>
			);
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

		function Foo(props) {
			const [container, setContainer] = useState(scratch);
			set = setContainer;

			return (
				<div
					ref={r => {
						ref = r;
					}}
				>
					<p>Hello</p>
					{createPortal(props.children, container)}
				</div>
			);
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

		set(() => ref);
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

		function Foo(props) {
			const [mounted, setMounted] = useState(false);
			const [mounted2, setMounted2] = useState(false);
			toggle = () => setMounted(s => !s);
			toggle2 = () => setMounted2(s => !s);
			return (
				<div>
					<p>Hello</p>
					{createPortal(mounted && props.children, scratch)}
					{createPortal(mounted2 && props.children, scratch)}
				</div>
			);
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

		function Foo(props) {
			const [root, setRoot] = useState(scratch);
			toggle = () => setRoot(() => root2);
			return (
				<div
					ref={r => {
						root2 = r;
					}}
				>
					<p>Hello</p>
					{createPortal(props.children, scratch)}
					{createPortal(props.children, root)}
				</div>
			);
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

		function Bar() {
			const [mounted, setMounted] = useState(false);
			toggle2 = () => setMounted(s => !s);
			return (
				<div
					ref={r => {
						inner = r;
					}}
				>
					<p>Inner</p>
					{mounted && createPortal(<p>hiFromBar</p>, scratch)}
					{mounted && createPortal(<p>innerPortal</p>, inner)}
				</div>
			);
		}

		function Foo(props) {
			const [mounted, setMounted] = useState(false);
			toggle = () => setMounted(s => !s);
			return (
				<div>
					<p>Hello</p>
					{mounted && createPortal(<Bar />, scratch)}
				</div>
			);
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

		function App() {
			const [visible, _setVisible] = useState(true);
			setVisible = _setVisible;

			return (
				<div id="app">
					test
					<PortalComponent show={visible} />
				</div>
			);
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

		const App = () => {
			const [open, setOpen] = useState(false);
			toggle = setOpen.bind(this, x => !x);
			return (
				<div>
					<button onClick={() => setOpen(!open)}>Show</button>
					{open ? 'Open' : 'Closed'}
					<Modal open={open}>Hello</Modal>
				</div>
			);
		};

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

		const App = () => {
			const [open, setOpen] = useState(false);
			toggle = setOpen.bind(this, x => !x);
			return (
				<div>
					<Modal open={open}>Hello</Modal>
					<button onClick={() => setOpen(!open)}>Show</button>
					{open ? 'Open' : 'Closed'}
				</div>
			);
		};

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

	it('should order effects well', () => {
		const calls = [];
		const Modal = ({ children }) => {
			useEffect(() => {
				calls.push('Modal');
			}, []);
			return createPortal(<div className="modal">{children}</div>, scratch);
		};

		const ModalButton = ({ i }) => {
			useEffect(() => {
				calls.push(`Button ${i}`);
			}, []);

			return <button>Action</button>;
		};

		const App = () => {
			useEffect(() => {
				calls.push('App');
			}, []);

			return (
				<Modal>
					<ModalButton i="1" />
					<ModalButton i="2" />
				</Modal>
			);
		};

		act(() => {
			render(<App />, scratch);
		});

		expect(calls).to.deep.equal(['Button 1', 'Button 2', 'Modal', 'App']);
	});

	it('should include containerInfo', () => {
		let root = document.createElement('div');
		document.body.appendChild(root);

		const A = () => <span>A</span>;

		let portal;
		function Foo(props) {
			portal = createPortal(props.children, root);
			return <div>{portal}</div>;
		}
		render(
			<Foo>
				<A />
			</Foo>,
			scratch
		);

		expect(portal.containerInfo).to.equal(root);

		root.parentNode.removeChild(root);
	});

	it('should order complex effects well', () => {
		const calls = [];
		const Parent = ({ children, isPortal }) => {
			useEffect(() => {
				calls.push(`${isPortal ? 'Portal ' : ''}Parent`);
			}, [isPortal]);

			return <div>{children}</div>;
		};

		const Child = ({ index, isPortal }) => {
			useEffect(() => {
				calls.push(`${isPortal ? 'Portal ' : ''}Child ${index}`);
			}, [index, isPortal]);

			return <div>{index}</div>;
		};

		const Portal = () => {
			const content = [1, 2, 3].map(index => (
				<Child key={index} index={index} isPortal />
			));

			useEffect(() => {
				calls.push('Portal');
			}, []);

			return createPortal(<Parent isPortal>{content}</Parent>, scratch2);
		};

		const App = () => {
			const content = [1, 2, 3].map(index => (
				<Child key={index} index={index} />
			));

			return (
				<React.Fragment>
					<Parent>{content}</Parent>
					<Portal />
				</React.Fragment>
			);
		};

		act(() => {
			render(<App />, scratch);
		});

		expect(calls).to.deep.equal([
			'Child 1',
			'Child 2',
			'Child 3',
			'Parent',
			'Portal Child 1',
			'Portal Child 2',
			'Portal Child 3',
			'Portal Parent',
			'Portal'
		]);
	});
});
