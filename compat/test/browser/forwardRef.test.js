import React, {
	createElement,
	render,
	createRef,
	forwardRef,
	hydrate,
	memo,
	useState,
	useRef,
	useImperativeHandle
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { setupRerender, act } from 'preact/test-utils';

/* eslint-disable react/jsx-boolean-value, react/display-name, prefer-arrow-callback */

describe('forwardRef', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should have isReactComponent flag', () => {
		let App = forwardRef((_, ref) => <div ref={ref}>foo</div>);
		expect(App.prototype.isReactComponent).to.equal(true);
	});

	it('should pass ref with createRef', () => {
		let App = forwardRef((_, ref) => <div ref={ref}>foo</div>);
		let ref = createRef();
		render(<App ref={ref} />, scratch);

		expect(ref.current).to.equalNode(scratch.firstChild);
	});

	it('should share the same ref reference', () => {
		let passedRef;
		let App = forwardRef((_, ref) => {
			passedRef = ref;
			return <div ref={ref}>foo</div>;
		});

		let ref = createRef();
		render(<App ref={ref} />, scratch);

		expect(ref).to.equal(passedRef);
	});

	it('should pass ref with a callback', () => {
		let App = forwardRef((_, ref) => (
			<div>
				<span ref={ref}>foo</span>
			</div>
		));
		let ref;
		render(<App ref={x => (ref = x)} />, scratch);

		expect(ref).to.equalNode(scratch.firstChild.firstChild);
	});

	it('should forward props', () => {
		let spy = sinon.spy();
		let App = forwardRef(spy);
		render(<App foo="bar" />, scratch);

		expect(spy).to.be.calledWithMatch({ foo: 'bar' });
	});

	it('should support nesting', () => {
		let passedRef;
		let Inner = forwardRef((_, ref) => {
			passedRef = ref;
			return <div ref={ref}>inner</div>;
		});
		let App = forwardRef((_, ref) => <Inner ref={ref} />);

		let ref = createRef();
		render(<App ref={ref} />, scratch);

		expect(ref).to.equal(passedRef);
	});

	it('should forward null on unmount', () => {
		let passedRef;
		let App = forwardRef((_, ref) => {
			passedRef = ref;
			return <div ref={ref}>foo</div>;
		});

		let ref = createRef();
		render(<App ref={ref} />, scratch);
		render(null, scratch);

		expect(passedRef.current).to.equal(null);
	});

	it('should be able to render and hydrate forwardRef components', () => {
		const Foo = ({ label, forwardedRef }) => (
			<div ref={forwardedRef}>{label}</div>
		);
		const App = forwardRef((props, ref) => (
			<Foo {...props} forwardedRef={ref} />
		));

		const ref = createRef();
		const markup = <App ref={ref} label="Hi" />;

		const element = document.createElement('div');
		element.innerHTML = '<div>Hi</div>';
		expect(element.textContent).to.equal('Hi');
		expect(ref.current == null).to.equal(true);

		hydrate(markup, element);
		expect(element.textContent).to.equal('Hi');
		expect(ref.current.tagName).to.equal('DIV');
	});

	it('should update refs when switching between children', () => {
		function Foo({ forwardedRef, setRefOnDiv }) {
			return (
				<section>
					<div ref={setRefOnDiv ? forwardedRef : null}>First</div>
					<span ref={setRefOnDiv ? null : forwardedRef}>Second</span>
				</section>
			);
		}

		const App = forwardRef((props, ref) => (
			<Foo {...props} forwardedRef={ref} />
		));

		const ref = createRef();

		render(<App ref={ref} setRefOnDiv={true} />, scratch);
		expect(ref.current.nodeName).to.equal('DIV');

		render(<App ref={ref} setRefOnDiv={false} />, scratch);
		expect(ref.current.nodeName).to.equal('SPAN');
	});

	it('should support rendering null', () => {
		const App = forwardRef(() => null);
		const ref = createRef();

		render(<App ref={ref} />, scratch);
		expect(ref.current == null).to.equal(true);
	});

	it('should support rendering null for multiple children', () => {
		const Foo = forwardRef(() => null);
		const ref = createRef();

		render(
			<div>
				<div />
				<Foo ref={ref} />
				<div />
			</div>,
			scratch
		);
		expect(ref.current == null).to.equal(true);
	});

	it('should support useImperativeHandle', () => {
		let setValue;
		const Foo = forwardRef((props, ref) => {
			const result = useState('');
			setValue = result[1];

			useImperativeHandle(
				ref,
				() => ({
					getValue: () => result[0]
				}),
				[result[0]]
			);

			return <input ref={ref} value={result[0]} />;
		});

		const ref = createRef();
		render(<Foo ref={ref} />, scratch);

		expect(typeof ref.current.getValue).to.equal('function');
		expect(ref.current.getValue()).to.equal('');

		setValue('x');
		rerender();
		expect(typeof ref.current.getValue).to.equal('function');
		expect(ref.current.getValue()).to.equal('x');
	});

	it('should not bailout if forwardRef is not wrapped in memo', () => {
		const Component = props => <div {...props} />;

		let renderCount = 0;

		const App = forwardRef((props, ref) => {
			renderCount++;
			return <Component {...props} forwardedRef={ref} />;
		});

		const ref = createRef();

		render(<App ref={ref} optional="foo" />, scratch);
		expect(renderCount).to.equal(1);

		render(<App ref={ref} optional="foo" />, scratch);
		expect(renderCount).to.equal(2);
	});

	it('should bailout if forwardRef is wrapped in memo', () => {
		const Component = props => <div ref={props.forwardedRef} />;

		let renderCount = 0;

		const App = memo(
			forwardRef((props, ref) => {
				renderCount++;
				return <Component {...props} forwardedRef={ref} />;
			})
		);

		const ref = createRef();

		render(<App ref={ref} optional="foo" />, scratch);
		expect(renderCount).to.equal(1);

		expect(ref.current.nodeName).to.equal('DIV');

		render(<App ref={ref} optional="foo" />, scratch);
		expect(renderCount).to.equal(1);

		const differentRef = createRef();

		render(<App ref={differentRef} optional="foo" />, scratch);
		expect(renderCount).to.equal(2);

		expect(ref.current == null).to.equal(true);
		expect(differentRef.current.nodeName).to.equal('DIV');

		render(<App ref={ref} optional="bar" />, scratch);
		expect(renderCount).to.equal(3);
	});

	it('should bailout if forwardRef is wrapped in memo using function refs', () => {
		const Component = props => <div ref={props.forwardedRef} />;

		let renderCount = 0;

		const App = memo(
			forwardRef((props, ref) => {
				renderCount++;
				return <Component {...props} forwardedRef={ref} />;
			})
		);

		const ref = sinon.spy();

		render(<App ref={ref} optional="foo" />, scratch);
		expect(renderCount).to.equal(1);

		expect(ref).to.have.been.called;

		ref.resetHistory();
		render(<App ref={ref} optional="foo" />, scratch);
		expect(renderCount).to.equal(1);

		const differentRef = sinon.spy();

		render(<App ref={differentRef} optional="foo" />, scratch);
		expect(renderCount).to.equal(2);

		expect(ref).to.have.been.calledWith(null);
		expect(differentRef).to.have.been.called;

		differentRef.resetHistory();
		render(<App ref={ref} optional="bar" />, scratch);
		expect(renderCount).to.equal(3);
	});

	it('should pass ref through memo() with custom comparer function', () => {
		const Foo = props => <div ref={props.forwardedRef} />;

		let renderCount = 0;

		const App = memo(
			forwardRef((props, ref) => {
				renderCount++;
				return <Foo {...props} forwardedRef={ref} />;
			}),
			(o, p) => o.a === p.a && o.b === p.b
		);

		const ref = createRef();

		render(<App ref={ref} a="0" b="0" c="1" />, scratch);
		expect(renderCount).to.equal(1);

		expect(ref.current.nodeName).to.equal('DIV');

		// Changing either a or b rerenders
		render(<App ref={ref} a="0" b="1" c="1" />, scratch);
		expect(renderCount).to.equal(2);

		// Changing c doesn't rerender
		render(<App ref={ref} a="0" b="1" c="2" />, scratch);
		expect(renderCount).to.equal(2);

		const App2 = memo(App, (o, p) => o.a === p.a && o.c === p.c);

		render(<App2 ref={ref} a="0" b="0" c="0" />, scratch);
		expect(renderCount).to.equal(3);

		// Changing just b no longer updates
		render(<App2 ref={ref} a="0" b="1" c="0" />, scratch);
		expect(renderCount).to.equal(3);

		// Changing just a and c updates
		render(<App2 ref={ref} a="2" b="2" c="2" />, scratch);
		expect(renderCount).to.equal(4);

		// Changing just c does not update
		render(<App2 ref={ref} a="2" b="2" c="3" />, scratch);
		expect(renderCount).to.equal(4);

		// Changing ref still rerenders
		const differentRef = createRef();

		render(<App2 ref={differentRef} a="2" b="2" c="3" />, scratch);
		expect(renderCount).to.equal(5);

		expect(ref.current == null).to.equal(true);
		expect(differentRef.current.nodeName).to.equal('DIV');
	});

	it('calls ref when this is a function.', () => {
		const spy = sinon.spy();
		const Bar = forwardRef((props, ref) => {
			useImperativeHandle(ref, () => ({ foo: 100 }));
			return null;
		});

		render(<Bar ref={spy} />, scratch);
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWithExactly({ foo: 100 });
	});

	it('stale ref missing with passed useRef', () => {
		let _ref = null;
		let _set = null;
		const Inner = forwardRef((props, ref) => {
			const _hook = useState(null);
			_ref = ref;
			_set = _hook[1];
			return <div ref={ref} />;
		});

		const Parent = () => {
			const parentRef = useRef(null);
			return <Inner ref={parentRef}>child</Inner>;
		};

		act(() => {
			render(<Parent />, scratch);
		});

		expect(_ref.current).to.equal(scratch.firstChild);

		act(() => {
			_set(1);
			rerender();
		});

		expect(_ref.current).to.equal(scratch.firstChild);
	});
});
