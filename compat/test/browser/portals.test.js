import React, {
	createElement,
	render,
	createPortal,
	useState,
	Component
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { setupRerender } from 'preact/test-utils';

/* eslint-disable react/jsx-boolean-value, react/display-name, prefer-arrow-callback */

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
		expect(dialog.childNodes.length).to.equal(2);
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
});
