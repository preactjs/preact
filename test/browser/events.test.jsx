import { createElement, render } from 'preact';
import {
	setupScratch,
	teardown,
	supportsPassiveEvents
} from '../_util/helpers';
import { vi } from 'vitest';

describe('event handling', () => {
	let scratch, proto;

	function fireEvent(on, type) {
		let e = document.createEvent('Event');
		e.initEvent(type, true, true);
		on.dispatchEvent(e);
	}

	beforeEach(() => {
		scratch = setupScratch();

		proto = document.createElement('div').constructor.prototype;

		vi.spyOn(proto, 'addEventListener');
		vi.spyOn(proto, 'removeEventListener');
	});

	afterEach(() => {
		teardown(scratch);

		proto.addEventListener.mockRestore();
		proto.removeEventListener.mockRestore();
	});

	it('should only register on* functions as handlers', () => {
		let click = () => {},
			onclick = () => {};

		render(<div click={click} onClick={onclick} />, scratch);

		expect(scratch.childNodes[0].attributes.length).to.equal(0);

		expect(proto.addEventListener).toHaveBeenCalledOnce();
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'click',
			expect.any(Function),
			false
		);
	});

	it('should only register truthy values as handlers', () => {
		function fooHandler() {}
		const falsyHandler = false;

		render(<div onClick={falsyHandler} onOtherClick={fooHandler} />, scratch);

		expect(proto.addEventListener).toHaveBeenCalledOnce();
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'otherclick',
			expect.any(Function),
			false
		);

		expect(proto.addEventListener).not.toHaveBeenCalledWith(
			'Click',
			expect.anything(),
			expect.anything()
		);
		expect(proto.addEventListener).not.toHaveBeenCalledWith(
			'click',
			expect.anything(),
			expect.anything()
		);
	});

	it('should support native event names', () => {
		let click = vi.fn(),
			mousedown = vi.fn();

		render(<div onclick={() => click(1)} onmousedown={mousedown} />, scratch);

		expect(proto.addEventListener).toHaveBeenCalledTimes(2);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'click',
			expect.any(Function),
			false
		);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'mousedown',
			expect.any(Function),
			false
		);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).toHaveBeenCalledOnce();
		expect(click).toHaveBeenCalledWith(1);
	});

	it('should support camel-case event names', () => {
		let click = vi.fn(),
			mousedown = vi.fn();

		render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);

		expect(proto.addEventListener).toHaveBeenCalledTimes(2);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'click',
			expect.any(Function),
			false
		);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'mousedown',
			expect.any(Function),
			false
		);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).toHaveBeenCalledOnce();
		expect(click).toHaveBeenCalledWith(1);
	});

	it('should update event handlers', () => {
		let click1 = vi.fn();
		let click2 = vi.fn();

		render(<div onClick={click1} />, scratch);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click1).toHaveBeenCalledOnce();
		expect(click2).not.toHaveBeenCalled();

		click1.mockClear();
		click2.mockClear();

		render(<div onClick={click2} />, scratch);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click1).not.toHaveBeenCalled();
		expect(click2).toHaveBeenCalled();
	});

	it('should remove event handlers', () => {
		let click = vi.fn(),
			mousedown = vi.fn();

		render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);
		render(<div onClick={() => click(2)} />, scratch);

		expect(proto.removeEventListener).toHaveBeenCalledWith(
			'mousedown',
			expect.any(Function),
			false
		);

		fireEvent(scratch.childNodes[0], 'mousedown');
		expect(mousedown).not.toHaveBeenCalled();

		proto.removeEventListener.mockClear();
		click.mockClear();
		mousedown.mockClear();

		render(<div />, scratch);

		expect(proto.removeEventListener).toHaveBeenCalledWith(
			'click',
			expect.any(Function),
			false
		);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).not.toHaveBeenCalled();
	});

	it('should register events not appearing on dom nodes', () => {
		let onAnimationEnd = () => {};

		render(<div onanimationend={onAnimationEnd} />, scratch);
		expect(proto.addEventListener).toHaveBeenCalledOnce();
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'animationend',
			expect.any(Function),
			false
		);
	});

	// Skip test if browser doesn't support passive events
	if (supportsPassiveEvents()) {
		it('should use capturing for event props ending with *Capture', () => {
			let click = vi.fn();

			render(
				<div onClickCapture={click}>
					<button type="button">Click me</button>
				</div>,
				scratch
			);

			let btn = scratch.firstChild.firstElementChild;
			btn.click();

			expect(click).toHaveBeenCalledOnce();

			// IE doesn't set it
			if (!/Edge/.test(navigator.userAgent)) {
				expect(click).toHaveBeenCalledWith(
					expect.objectContaining({ eventPhase: 0 })
				); // capturing
			}
		});

		it('should support both capturing and non-capturing events on the same element', () => {
			let click = vi.fn(),
				clickCapture = vi.fn();

			render(
				<div onClick={click} onClickCapture={clickCapture}>
					<button />
				</div>,
				scratch
			);

			let root = scratch.firstChild;
			root.firstElementChild.click();

			expect(clickCapture).toHaveBeenCalledOnce();
			expect(click).toHaveBeenCalledOnce();
		});
	}

	// Uniquely named in that the base event names end with 'Capture'
	it('should support (got|lost)PointerCapture events', () => {
		let gotPointerCapture = vi.fn(),
			gotPointerCaptureCapture = vi.fn(),
			lostPointerCapture = vi.fn(),
			lostPointerCaptureCapture = vi.fn();

		render(
			<div
				onGotPointerCapture={gotPointerCapture}
				onLostPointerCapture={lostPointerCapture}
			/>,
			scratch
		);

		expect(proto.addEventListener).toHaveBeenCalledTimes(2);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'gotpointercapture',
			expect.any(Function),
			false
		);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'lostpointercapture',
			expect.any(Function),
			false
		);

		proto.addEventListener.mockClear();

		render(
			<div
				onGotPointerCaptureCapture={gotPointerCaptureCapture}
				onLostPointerCaptureCapture={lostPointerCaptureCapture}
			/>,
			scratch
		);

		expect(proto.addEventListener).toHaveBeenCalledTimes(2);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'gotpointercapture',
			expect.any(Function),
			true
		);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'lostpointercapture',
			expect.any(Function),
			true
		);
	});

	it('should support camel-case focus event names', () => {
		render(<div onFocusIn={() => {}} onFocusOut={() => {}} />, scratch);

		expect(proto.addEventListener).toHaveBeenCalledTimes(2);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'focusin',
			expect.any(Function),
			false
		);
		expect(proto.addEventListener).toHaveBeenCalledWith(
			'focusout',
			expect.any(Function),
			false
		);
	});
});
