import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useImperativeHandle, useRef } from '../../src';

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

	it('Updates given ref with args', () => {
		let ref;

		function Comp({ a }) {
			ref = useRef({});
			useImperativeHandle(ref, () => ({ test: () => 'test' + a }), [a]);
			return <p>Test</p>;
		}

		render(<Comp a={0} />, scratch);
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test0');

		render(<Comp a={1} />, scratch);
		expect(ref.current).to.have.property('test');
		expect(ref.current.test()).to.equal('test1');
	});

	it('should not update ref when args have not changed', () => {
		let ref;

		function Comp() {
			ref = useRef({});
			useImperativeHandle(ref, () => ({ test: () => 'test' }), [1]);
			return <p>Test</p>;
		}

		render(<Comp />, scratch);
		expect(ref.current.test()).to.equal('test');

		render(<Comp />, scratch);
		expect(ref.current.test()).to.equal('test');
	});
});
