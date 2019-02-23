import { createElement as h, render, createRef, forwardRef } from '../../src';
import { setupScratch, teardown } from '../../../test/_util/helpers';
/* eslint-disable react/jsx-boolean-value, react/display-name, prefer-arrow-callback */

/** @jsx h */
describe('forwardRef', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should pass ref with createRef', () => {
		let App = forwardRef((_, ref) => <div ref={ref}>foo</div>);
		let ref = createRef();
		render(<App ref={ref} />, scratch);

		expect(ref.current).to.equal(scratch.firstChild);
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
		let App = forwardRef((_, ref) => <div><span ref={ref}>foo</span></div>);
		let ref;
		render(<App ref={x => (ref = x)} />, scratch);

		expect(ref).to.equal(scratch.firstChild.firstChild);
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
});
