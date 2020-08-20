import { createElement, createRoot } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useImperativeHandle, useRef, useState } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';

/** @jsx createElement */

describe('useImperativeHandle', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	let render;

	beforeEach(() => {
		scratch = setupScratch();
		({ render } = createRoot(scratch));
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('Mutates given ref', () => {
		let ref;

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, () => ({ test: () => 'test' }), []);
			return <p>Test</p>;
		}

		render(<Comp />);
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test');
	});

	it('calls createHandle after every render by default', () => {
		let ref,
			createHandleSpy = sinon.spy();

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, createHandleSpy);
			return <p>Test</p>;
		}

		render(<Comp />);
		expect(createHandleSpy).to.have.been.calledOnce;

		render(<Comp />);
		expect(createHandleSpy).to.have.been.calledTwice;

		render(<Comp />);
		expect(createHandleSpy).to.have.been.calledThrice;
	});

	it('calls createHandle only on mount if an empty array is passed', () => {
		let ref,
			createHandleSpy = sinon.spy();

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, createHandleSpy, []);
			return <p>Test</p>;
		}

		render(<Comp />);
		expect(createHandleSpy).to.have.been.calledOnce;

		render(<Comp />);
		expect(createHandleSpy).to.have.been.calledOnce;
	});

	it('Updates given ref when args change', () => {
		let ref,
			createHandleSpy = sinon.spy();

		function Comp({ a }) {
			ref = useRef({});
			useImperativeHandle(
				ref,
				() => {
					createHandleSpy();
					return { test: () => 'test' + a };
				},
				[a]
			);
			return <p>Test</p>;
		}

		render(<Comp a={0} />);
		expect(createHandleSpy).to.have.been.calledOnce;
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test0');

		render(<Comp a={1} />);
		expect(createHandleSpy).to.have.been.calledTwice;
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test1');

		render(<Comp a={0} />);
		expect(createHandleSpy).to.have.been.calledThrice;
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test0');
	});

	it('Updates given ref when passed-in ref changes', () => {
		let ref1, ref2;

		/** @type {(arg: any) => void} */
		let setRef;

		/** @type {() => void} */
		let updateState;

		const createHandleSpy = sinon.spy(() => ({
			test: () => 'test'
		}));

		function Comp() {
			ref1 = useRef({});
			ref2 = useRef({});

			const [ref, setRefInternal] = useState(ref1);
			setRef = setRefInternal;

			let [value, setState] = useState(0);
			updateState = () => setState((value + 1) % 2);

			useImperativeHandle(ref, createHandleSpy, []);
			return <p>Test</p>;
		}

		render(<Comp a={0} />);
		expect(createHandleSpy).to.have.been.calledOnce;

		updateState();
		rerender();
		expect(createHandleSpy).to.have.been.calledOnce;

		setRef(ref2);
		rerender();
		expect(createHandleSpy).to.have.been.calledTwice;

		updateState();
		rerender();
		expect(createHandleSpy).to.have.been.calledTwice;

		setRef(ref1);
		rerender();
		expect(createHandleSpy).to.have.been.calledThrice;
	});

	it('should not update ref when args have not changed', () => {
		let ref,
			createHandleSpy = sinon.spy(() => ({ test: () => 'test' }));

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, createHandleSpy, [1]);
			return <p>Test</p>;
		}

		render(<Comp />);
		expect(createHandleSpy).to.have.been.calledOnce;
		expect(ref.current.test()).to.equal('test');

		render(<Comp />);
		expect(createHandleSpy).to.have.been.calledOnce;
		expect(ref.current.test()).to.equal('test');
	});

	it('should not throw with nullish ref', () => {
		function Comp() {
			useImperativeHandle(null, () => ({ test: () => 'test' }), [1]);
			return <p>Test</p>;
		}

		expect(() => render(<Comp />)).to.not.throw();
	});
});
