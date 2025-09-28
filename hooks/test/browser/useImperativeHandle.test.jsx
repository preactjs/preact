import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useImperativeHandle, useRef, useState } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { vi } from 'vitest';

describe('useImperativeHandle', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
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

		render(<Comp />, scratch);
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test');
	});

	it('Calls ref unmounting function', () => {
		let ref;
		const unmount = vi.fn();

		function Comp() {
			useImperativeHandle(
				r => {
					ref = r;
					return unmount;
				},
				() => ({ test: () => 'test' }),
				[]
			);
			return <p>Test</p>;
		}

		render(<Comp />, scratch);
		expect(ref).to.have.property('test');
		expect(ref.test()).to.equal('test');
		render(null, scratch);
		expect(unmount).toHaveBeenCalledOnce();
		expect(ref).to.equal(null);
	});

	it('calls createHandle after every render by default', () => {
		let ref,
			createHandleSpy = vi.fn();

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, createHandleSpy);
			return <p>Test</p>;
		}

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledTimes(2);

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledTimes(3);
	});

	it('calls createHandle only on mount if an empty array is passed', () => {
		let ref,
			createHandleSpy = vi.fn();

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, createHandleSpy, []);
			return <p>Test</p>;
		}

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();
	});

	it('Updates given ref when args change', () => {
		let ref,
			createHandleSpy = vi.fn();

		function Comp({ a }) {
			ref = useRef({});
			useImperativeHandle(ref, () => {
				createHandleSpy();
				return { test: () => 'test' + a };
			}, [a]);
			return <p>Test</p>;
		}

		render(<Comp a={0} />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test0');

		render(<Comp a={1} />, scratch);
		expect(createHandleSpy).toHaveBeenCalledTimes(2);
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test1');

		render(<Comp a={0} />, scratch);
		expect(createHandleSpy).toHaveBeenCalledTimes(3);
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test0');
	});

	it('Updates given ref when passed-in ref changes', () => {
		let ref1, ref2;

		/** @type {(arg: any) => void} */
		let setRef;

		/** @type {() => void} */
		let updateState;

		const createHandleSpy = vi.fn(() => ({
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

		render(<Comp a={0} />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();

		updateState();
		rerender();
		expect(createHandleSpy).toHaveBeenCalledOnce();

		setRef(ref2);
		rerender();
		expect(createHandleSpy).toHaveBeenCalledTimes(2);

		updateState();
		rerender();
		expect(createHandleSpy).toHaveBeenCalledTimes(2);

		setRef(ref1);
		rerender();
		expect(createHandleSpy).toHaveBeenCalledTimes(3);
	});

	it('should not update ref when args have not changed', () => {
		let ref,
			createHandleSpy = vi.fn(() => ({ test: () => 'test' }));

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, createHandleSpy, [1]);
			return <p>Test</p>;
		}

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();
		expect(ref.current.test()).to.equal('test');

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();
		expect(ref.current.test()).to.equal('test');
	});

	it('should not throw with nullish ref', () => {
		function Comp() {
			useImperativeHandle(null, () => ({ test: () => 'test' }), [1]);
			return <p>Test</p>;
		}

		expect(() => render(<Comp />, scratch)).to.not.throw();
	});

	it('should reset ref object to null when the component get unmounted', () => {
		let ref,
			createHandleSpy = vi.fn(() => ({ test: () => 'test' }));

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, createHandleSpy, [1]);
			return <p>Test</p>;
		}

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();
		expect(ref.current).to.not.equal(null);

		render(<div />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();
		expect(ref.current).to.equal(null);
	});

	it('should reset ref callback to null when the component get unmounted', () => {
		const ref = vi.fn();
		const handle = { test: () => 'test' };
		const createHandleSpy = vi.fn(() => handle);

		function Comp() {
			useImperativeHandle(ref, createHandleSpy, [1]);
			return <p>Test</p>;
		}

		render(<Comp />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();
		expect(ref).toHaveBeenCalledWith(handle);

		ref.mockClear();

		render(<div />, scratch);
		expect(createHandleSpy).toHaveBeenCalledOnce();
		expect(ref).toHaveBeenCalledWith(null);
	});
});
