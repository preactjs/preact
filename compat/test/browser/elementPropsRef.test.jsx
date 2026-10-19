import {
	createElement,
	render,
	cloneElement,
	createRef,
	Component
} from 'preact/compat';
import { jsx } from 'preact/jsx-runtime';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('compat element.props.ref', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	class ClassChild extends Component {
		render() {
			return <span>class</span>;
		}
	}

	// What libraries detecting React 19 do, e.g. MUI's getReactElementRef +
	// useForkRef: read the child's ref from its props and merge it with theirs.
	function ForkRef({ children, ownRef }) {
		const childRef = children.props.ref;
		return cloneElement(children, {
			ref(node) {
				ownRef.current = node;
				if (typeof childRef == 'function') childRef(node);
				else if (childRef) childRef.current = node;
			}
		});
	}

	it('should expose the ref of DOM elements on props', () => {
		const ref = createRef();
		const element = <div ref={ref} />;

		expect(element.props.ref).to.equal(ref);
		expect(Object.keys(element.props)).to.not.include('ref');
		expect({ ...element.props }).to.not.have.property('ref');

		render(element, scratch);
		expect(ref.current).to.equal(scratch.firstChild);
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	it('should expose the ref of class elements on props', () => {
		const ref = createRef();
		const element = <ClassChild ref={ref} />;

		expect(element.props.ref).to.equal(ref);
		expect(Object.keys(element.props)).to.not.include('ref');

		render(element, scratch);
		expect(ref.current).to.be.instanceOf(ClassChild);
		expect(Object.keys(ref.current.props)).to.not.include('ref');
	});

	it('should keep the ref of function elements as a regular prop', () => {
		const ref = createRef();
		function Fn(props) {
			return <p ref={props.ref}>fn</p>;
		}
		const element = <Fn ref={ref} />;

		expect(Object.keys(element.props)).to.include('ref');

		render(element, scratch);
		expect(ref.current).to.equal(scratch.firstChild);
	});

	it('should expose the ref for elements created by the JSX runtime', () => {
		const ref = createRef();
		expect(jsx('div', { ref }).props.ref).to.equal(ref);
	});

	it('should use the ref passed to cloneElement', () => {
		const ref = createRef();
		const other = createRef();
		const clone = cloneElement(<div ref={ref} />, { ref: other });
		expect(clone.props.ref).to.equal(other);
		expect(cloneElement(<div ref={ref} />).props.ref).to.equal(ref);
	});

	it('should let libraries merge the ref of a DOM child', () => {
		const userRef = createRef();
		const ownRef = createRef();
		render(
			<ForkRef ownRef={ownRef}>
				<button ref={userRef}>click</button>
			</ForkRef>,
			scratch
		);

		expect(ownRef.current).to.equal(scratch.firstChild);
		expect(userRef.current).to.equal(scratch.firstChild);
	});

	it('should let libraries merge the ref of a class child', () => {
		const userRef = createRef();
		const ownRef = createRef();
		render(
			<ForkRef ownRef={ownRef}>
				<ClassChild ref={userRef} />
			</ForkRef>,
			scratch
		);

		expect(ownRef.current).to.be.instanceOf(ClassChild);
		expect(userRef.current).to.equal(ownRef.current);
	});

	it('should not render the ref as an attribute when spreading props', () => {
		const ref = createRef();
		function Spread({ children }) {
			return <section {...children.props} />;
		}
		render(
			<Spread>
				<div ref={ref} id="a" />
			</Spread>,
			scratch
		);

		expect(scratch.innerHTML).to.equal('<section id="a"></section>');
		expect(ref.current).to.equal(null);
	});
});
