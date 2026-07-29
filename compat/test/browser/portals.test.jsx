import {
	createElement,
	render,
	createPortal,
	useEffect,
	Fragment,
	useId
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { act } from 'preact/test-utils';
import { expect } from 'chai';

/* eslint-disable react/jsx-boolean-value, react/display-name, prefer-arrow-callback */

// The hooks-free portal behavior is tested in test/browser/portals.test.jsx;
// this file covers the compat-only `containerInfo` property and the
// hooks-based portal tests (useId, effect ordering).
describe('Portal', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	/** @type {HTMLDivElement} */
	let scratch2;

	beforeEach(() => {
		scratch = setupScratch();
		scratch2 = setupScratch('scratch-2');
	});

	afterEach(() => {
		teardown(scratch);
		teardown(scratch2);
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
				<Fragment>
					<Parent>{content}</Parent>
					<Portal />
				</Fragment>
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
