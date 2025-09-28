import { render } from 'preact';
import {
	setupScratch,
	teardown,
	createEvent,
	supportsPassiveEvents
} from '../../../test/_util/helpers';

import { createElement } from 'preact/compat';
import { vi } from 'vitest';

describe('preact/compat events', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	let proto;

	beforeEach(() => {
		scratch = setupScratch();

		proto = Element.prototype;
		vi.spyOn(proto, 'addEventListener');
		vi.spyOn(proto, 'removeEventListener');
	});

	afterEach(() => {
		teardown(scratch);

		proto.addEventListener.mockRestore();
		proto.removeEventListener.mockRestore();
	});

	it('should patch events', () => {
		let spy = vi.fn(event => {
			expect(event.isDefaultPrevented()).to.be.false;
			event.preventDefault();
			expect(event.isDefaultPrevented()).to.be.true;

			expect(event.isPropagationStopped()).to.be.false;
			event.stopPropagation();
			expect(event.isPropagationStopped()).to.be.true;
		});

		render(<div onClick={spy} />, scratch);
		scratch.firstChild.click();

		expect(spy).toHaveBeenCalledOnce();
		const event = spy.mock.calls[0][0];
		expect(event).to.haveOwnProperty('persist');
		expect(event).to.haveOwnProperty('nativeEvent');
		expect(event).to.haveOwnProperty('isDefaultPrevented');
		expect(event).to.haveOwnProperty('isPropagationStopped');
		expect(typeof event.persist).to.equal('function');
		expect(typeof event.isDefaultPrevented).to.equal('function');
		expect(typeof event.isPropagationStopped).to.equal('function');

		expect(() => event.persist()).to.not.throw();
		expect(() => event.isDefaultPrevented()).to.not.throw();
		expect(() => event.isPropagationStopped()).to.not.throw();
	});

	it('should normalize ondoubleclick event', () => {
		let vnode = <div onDoubleClick={() => null} />;
		expect(vnode.props).to.haveOwnProperty('ondblclick');
	});

	it('should normalize onChange for textarea', () => {
		let vnode = <textarea onChange={() => null} />;
		expect(vnode.props).to.haveOwnProperty('oninput');
		expect(vnode.props).to.not.haveOwnProperty('onchange');

		vnode = <textarea oninput={() => null} onChange={() => null} />;
		expect(vnode.props).to.haveOwnProperty('oninput');
		expect(vnode.props).to.not.haveOwnProperty('onchange');
	});

	it('should by pass onInputCapture normalization for custom onInputAction when using it along with onChange', () => {
		const onInputAction = () => null;
		const onChange = () => null;

		let vnode = <textarea onChange={onChange} onInputAction={onInputAction} />;

		expect(vnode.props).to.haveOwnProperty('onInputAction');
		expect(vnode.props.onInputAction).to.equal(onInputAction);
		expect(vnode.props).to.haveOwnProperty('oninput');
		expect(vnode.props.oninput).to.equal(onChange);
		expect(vnode.props).to.not.haveOwnProperty('oninputCapture');
	});

	it('should normalize onChange for range', () => {
		render(<input type="range" onChange={() => null} />, scratch);
		expect(proto.addEventListener).toHaveBeenCalledOnce();
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'input',
			expect.any(Function),
			false
		);
	});

	it('should support onAnimationEnd', () => {
		const func = vi.fn(() => {});
		render(<div onAnimationEnd={func} />, scratch);

		expect(proto.addEventListener).toHaveBeenCalledOnce();
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'animationend',
			expect.any(Function),
			false
		);

		scratch.firstChild.dispatchEvent(createEvent('animationend'));
		expect(func).toHaveBeenCalledOnce();

		render(<div />, scratch);
		expect(proto.removeEventListener).toHaveBeenCalledOnce();
		expect(proto.removeEventListener).toHaveBeenCalledWith(
			'animationend',
			expect.any(Function),
			false
		);
	});

	it('should support onTouch* events', () => {
		const onTouchStart = vi.fn();
		const onTouchEnd = vi.fn();
		const onTouchMove = vi.fn();
		const onTouchCancel = vi.fn();

		render(
			<div
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
				onTouchMove={onTouchMove}
				onTouchCancel={onTouchCancel}
			/>,
			scratch
		);

		expect(proto.addEventListener.mock.calls.length).to.eql(4);
		expect(proto.addEventListener.mock.calls[0].length).to.eql(3);
		expect(proto.addEventListener.mock.calls[0][0]).to.eql('touchstart');
		expect(proto.addEventListener.mock.calls[0][2]).to.eql(false);
		expect(proto.addEventListener.mock.calls[1].length).to.eql(3);
		expect(proto.addEventListener.mock.calls[1][0]).to.eql('touchend');
		expect(proto.addEventListener.mock.calls[1][2]).to.eql(false);
		expect(proto.addEventListener.mock.calls[2].length).to.eql(3);
		expect(proto.addEventListener.mock.calls[2][0]).to.eql('touchmove');
		expect(proto.addEventListener.mock.calls[2][2]).to.eql(false);
		expect(proto.addEventListener.mock.calls[3].length).to.eql(3);
		expect(proto.addEventListener.mock.calls[3][0]).to.eql('touchcancel');
		expect(proto.addEventListener.mock.calls[3][2]).to.eql(false);

		scratch.firstChild.dispatchEvent(createEvent('touchstart'));
		expect(onTouchStart).toHaveBeenCalledOnce();

		scratch.firstChild.dispatchEvent(createEvent('touchmove'));
		expect(onTouchMove).toHaveBeenCalledOnce();

		scratch.firstChild.dispatchEvent(createEvent('touchend'));
		expect(onTouchEnd).toHaveBeenCalledOnce();

		scratch.firstChild.dispatchEvent(createEvent('touchcancel'));
		expect(onTouchCancel).toHaveBeenCalledOnce();

		render(<div />, scratch);

		expect(proto.removeEventListener.mock.calls.length).to.eql(4);
		expect(proto.removeEventListener.mock.calls[0].length).to.eql(3);
		expect(proto.removeEventListener.mock.calls[0][0]).to.eql('touchstart');
		expect(proto.removeEventListener.mock.calls[0][2]).to.eql(false);
		expect(proto.removeEventListener.mock.calls[1].length).to.eql(3);
		expect(proto.removeEventListener.mock.calls[1][0]).to.eql('touchend');
		expect(proto.removeEventListener.mock.calls[1][2]).to.eql(false);
		expect(proto.removeEventListener.mock.calls[2].length).to.eql(3);
		expect(proto.removeEventListener.mock.calls[2][0]).to.eql('touchmove');
		expect(proto.removeEventListener.mock.calls[2][2]).to.eql(false);
		expect(proto.removeEventListener.mock.calls[3].length).to.eql(3);
		expect(proto.removeEventListener.mock.calls[3][0]).to.eql('touchcancel');
		expect(proto.removeEventListener.mock.calls[3][2]).to.eql(false);
	});

	it('should support onTransitionEnd', () => {
		const func = vi.fn(() => {});
		render(<div onTransitionEnd={func} />, scratch);

		expect(proto.addEventListener).toHaveBeenCalledOnce();
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'transitionend',
			expect.any(Function),
			false
		);

		scratch.firstChild.dispatchEvent(createEvent('transitionend'));
		expect(func).toHaveBeenCalledOnce();

		render(<div />, scratch);
		expect(proto.removeEventListener).toHaveBeenCalledOnce();
		expect(proto.removeEventListener).toHaveBeenCalledWith(
			'transitionend',
			expect.any(Function),
			false
		);
	});

	it('should normalize onChange', () => {
		let props = { onChange() {} };

		function expectToBeNormalized(vnode, desc) {
			expect(vnode, desc)
				.to.have.property('props')
				.with.all.keys(['oninput'].concat(vnode.props.type ? 'type' : []))
				.and.property('oninput')
				.that.is.a('function');
		}

		function expectToBeUnmodified(vnode, desc) {
			expect(vnode, desc)
				.to.have.property('props')
				.eql({
					...props,
					...(vnode.props.type ? { type: vnode.props.type } : {})
				});
		}

		expectToBeUnmodified(<div {...props} />, '<div>');
		expectToBeUnmodified(
			<input {...props} type="radio" />,
			'<input type="radio">'
		);
		expectToBeUnmodified(
			<input {...props} type="checkbox" />,
			'<input type="checkbox">'
		);
		expectToBeUnmodified(
			<input {...props} type="file" />,
			'<input type="file">'
		);

		expectToBeNormalized(<textarea {...props} />, '<textarea>');
		expectToBeNormalized(<input {...props} />, '<input>');
		expectToBeNormalized(
			<input {...props} type="text" />,
			'<input type="text">'
		);
	});

	it('should normalize beforeinput event listener', () => {
		let spy = vi.fn();
		render(<input onBeforeInput={spy} />, scratch);
		scratch.firstChild.dispatchEvent(createEvent('beforeinput'));
		expect(spy).toHaveBeenCalledOnce();
	});

	it('should normalize compositionstart event listener', () => {
		let spy = vi.fn();
		render(<input onCompositionStart={spy} />, scratch);
		scratch.firstChild.dispatchEvent(createEvent('compositionstart'));
		expect(spy).toHaveBeenCalledOnce();
	});

	it('should normalize onFocus to onfocusin', () => {
		let spy = vi.fn();
		render(<input onFocus={spy} />, scratch);
		scratch.firstChild.dispatchEvent(createEvent('focusin'));
		expect(spy).toHaveBeenCalledOnce();
	});

	it('should normalize onBlur to onfocusout', () => {
		let spy = vi.fn();
		render(<input onBlur={spy} />, scratch);
		scratch.firstChild.dispatchEvent(createEvent('focusout'));
		expect(spy).toHaveBeenCalledOnce();
	});

	if (supportsPassiveEvents()) {
		it('should use capturing for event props ending with *Capture', () => {
			let click = vi.fn();

			render(
				<div onTouchMoveCapture={click}>
					<button type="button">Click me</button>
				</div>,
				scratch
			);

			expect(proto.addEventListener).toHaveBeenCalledOnce();
			expect(proto.addEventListener).toHaveBeenCalledWith(
				'touchmove',
				expect.any(Function),
				true
			);
		});
	}
});
