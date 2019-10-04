import { createElement as h, render, useImperativeHandle, useRef } from '../../../src';
import { setupScratch, teardown } from '../../_util/helpers';

/** @jsx h */


describe('useImperativeHandle', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
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

	it('Updates given ref when args change', () => {
		let ref, createHandleSpy = sinon.spy();

		function Comp({ a }) {
			ref = useRef({});
			useImperativeHandle(ref, () => {
				createHandleSpy();
				return { test: () => 'test' + a };
			}, [a]);
			return <p>Test</p>;
		}

		render(<Comp a={0} />, scratch);
		expect(createHandleSpy).to.have.been.calledOnce;
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test0');

		render(<Comp a={1} />, scratch);
		expect(createHandleSpy).to.have.been.calledTwice;
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test1');

		render(<Comp a={0} />, scratch);
		expect(createHandleSpy).to.have.been.calledThrice;
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test0');
	});

	it('should not update ref when args have not changed', () => {
		let ref, createHandleSpy = sinon.spy(() => ({ test: () => 'test' }));

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, createHandleSpy, [1]);
			return <p>Test</p>;
		}

		render(<Comp />, scratch);
		expect(createHandleSpy).to.have.been.calledOnce;
		expect(ref.current.test()).to.equal('test');

		render(<Comp />, scratch);
		expect(createHandleSpy).to.have.been.calledOnce;
		expect(ref.current.test()).to.equal('test');
	});

	it('should not throw with nullish ref', () => {
		function Comp() {
			useImperativeHandle(null, () => ({ test: () => 'test' }), [1]);
			return <p>Test</p>;
		}

		expect(() => render(<Comp />, scratch)).to.not.throw();
	});
});
