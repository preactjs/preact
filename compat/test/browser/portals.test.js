import React, {
	createElement,
	render,
	createPortal,
	useState,
	Component,
	useEffect
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { setupRerender, act } from 'preact/test-utils';

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

	it('should toggle the portal', () => {
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
		let spy = sinon.spy();
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
		expect(spy).not.to.be.called;

		set({});
		rerender();
		expect(spy).not.to.be.called;
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
		let toggle, toggle2;

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
		let toggle, toggle2;

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
		let toggle, toggle2;

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
		let toggle, toggle2, inner;

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

		let spy = sinon.spy();
		class Child extends Component {
			componentDidMount() {
				spy();
			}

			render() {
				return <div id="child">child</div>;
			}
		}

		let spyParent = sinon.spy();
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
		expect(spyParent).to.be.calledOnce;
		expect(spy).to.be.calledOnce;

		// Render twice to trigger update scenario
		render(<App />, root);
		render(<App />, root);

		let domNew = document.getElementById('child');
		expect(dom).to.equal(domNew);
		expect(spyParent).to.be.calledOnce;
		expect(spy).to.be.calledOnce;
	});

	it('should switch between non portal and portal node (Modal as lastChild)', () => {
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
