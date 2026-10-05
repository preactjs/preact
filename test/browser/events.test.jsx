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

	it('should not invoke an ancestor handler attached while an event bubbles', () => {
		const onAncestorClick = vi.fn();
		const onButtonClick = () => {
			render(
				<div onClick={onAncestorClick}>
					<button onClick={onButtonClick}>Click me</button>
				</div>,
				scratch
			);
		};

		render(
			<div>
				<button onClick={onButtonClick}>Click me</button>
			</div>,
			scratch
		);

		fireEvent(scratch.querySelector('button'), 'click');
		expect(onAncestorClick).not.toHaveBeenCalled();

		fireEvent(scratch.querySelector('button'), 'click');
		expect(onAncestorClick).toHaveBeenCalledOnce();
	});

	it('should preserve an ancestor timestamp when a shared handler is attached to a sibling', () => {
		const shared = vi.fn();
		const onButtonClick = () => {
			render(
				<div onClick={shared}>
					<button onClick={onButtonClick}>Dispatch</button>
					<button onClick={shared}>New listener</button>
				</div>,
				scratch
			);
		};

		render(
			<div onClick={shared}>
				<button onClick={onButtonClick}>Dispatch</button>
			</div>,
			scratch
		);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(shared).toHaveBeenCalledOnce();

		shared.mockClear();
		fireEvent(scratch.querySelectorAll('button')[1], 'click');
		expect(shared).toHaveBeenCalledTimes(2);
	});

	it('should skip only the newly attached ancestor when ancestors share a handler', () => {
		const targets = [];
		const shared = e => targets.push(e.currentTarget.id);
		const onButtonClick = () => {
			render(tree(shared), scratch);
		};
		const tree = innerHandler => (
			<div id="outer" onClick={shared}>
				<div id="inner" onClick={innerHandler}>
					<button onClick={onButtonClick}>Dispatch</button>
				</div>
			</div>
		);

		render(tree(undefined), scratch);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(targets).toEqual(['outer']);

		targets.length = 0;
		fireEvent(scratch.querySelector('button'), 'click');
		expect(targets).toEqual(['inner', 'outer']);
	});

	it('should preserve a click timestamp when the same handler is added for another event', () => {
		const events = [];
		const shared = e => events.push(e.type);
		const onButtonClick = () => render(tree(shared), scratch);
		const tree = mouseDownHandler => (
			<div onClick={shared} onMouseDown={mouseDownHandler}>
				<button onClick={onButtonClick}>Dispatch</button>
			</div>
		);

		render(tree(undefined), scratch);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(events).toEqual(['click']);

		fireEvent(scratch.querySelector('button'), 'mousedown');
		expect(events).toEqual(['click', 'mousedown']);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(events).toEqual(['click', 'mousedown', 'click']);
	});

	it('should keep capture and bubble timestamps independent for a shared handler', () => {
		const phases = [];
		const shared = e => phases.push(e.eventPhase);
		const onButtonClick = () => render(tree(shared), scratch);
		const tree = captureHandler => (
			<div onClick={shared} onClickCapture={captureHandler}>
				<button onClick={onButtonClick}>Dispatch</button>
			</div>
		);

		render(tree(undefined), scratch);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(phases).toEqual([Event.BUBBLING_PHASE]);

		phases.length = 0;
		fireEvent(scratch.querySelector('button'), 'click');
		expect(phases).toEqual([Event.CAPTURING_PHASE, Event.BUBBLING_PHASE]);
	});

	it('should preserve a replaced listener timestamp without changing a shared new listener', () => {
		const original = vi.fn();
		const targets = [];
		const shared = e => targets.push(e.currentTarget.id);
		const onButtonClick = () => render(tree(shared, shared), scratch);
		const tree = (outerHandler, innerHandler) => (
			<div id="outer" onClick={outerHandler}>
				<div id="inner" onClick={innerHandler}>
					<button onClick={onButtonClick}>Dispatch</button>
				</div>
			</div>
		);

		render(tree(original, undefined), scratch);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(original).not.toHaveBeenCalled();
		expect(targets).toEqual(['outer']);

		targets.length = 0;
		fireEvent(scratch.querySelector('button'), 'click');
		expect(targets).toEqual(['inner', 'outer']);
	});

	it('should reset a listener timestamp after removal and reattachment', () => {
		const ancestor = vi.fn();
		let reattach = true;
		const onButtonClick = () => {
			if (reattach) {
				reattach = false;
				render(tree(undefined), scratch);
				render(tree(ancestor), scratch);
			}
		};
		const tree = handler => (
			<div onClick={handler}>
				<button onClick={onButtonClick}>Dispatch</button>
			</div>
		);

		render(tree(ancestor), scratch);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(ancestor).not.toHaveBeenCalled();
		fireEvent(scratch.querySelector('button'), 'click');
		expect(ancestor).toHaveBeenCalledOnce();
	});

	it('should support frozen callbacks when mounting, replacing and removing listeners', () => {
		const calls = [];
		const first = Object.freeze(() => calls.push('first'));
		const second = Object.freeze(() => calls.push('second'));

		expect(() => render(<div onClick={first} />, scratch)).not.toThrow();
		fireEvent(scratch.firstChild, 'click');
		expect(calls).toEqual(['first']);

		expect(() => render(<div onClick={second} />, scratch)).not.toThrow();
		fireEvent(scratch.firstChild, 'click');
		expect(calls).toEqual(['first', 'second']);
		expect(proto.addEventListener).toHaveBeenCalledOnce();

		render(<div />, scratch);
		fireEvent(scratch.firstChild, 'click');
		expect(calls).toEqual(['first', 'second']);
		expect(proto.removeEventListener).toHaveBeenCalledOnce();
	});

	it('should invoke an ancestor handler when its function is attached elsewhere while an event bubbles', () => {
		const shared = vi.fn();
		const App = ({ extra }) => (
			<div onClick={shared}>
				<button onClick={() => render(<App extra />, scratch)} />
				{extra && <span onClick={shared} />}
			</div>
		);

		render(<App />, scratch);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(shared).toHaveBeenCalledOnce();
	});

	it('should invoke an ancestor handler when its function is attached to another event while an event bubbles', () => {
		const shared = vi.fn();
		const App = ({ extra }) => (
			<div onClick={shared} onMouseDown={extra ? shared : undefined}>
				<button onClick={() => render(<App extra />, scratch)} />
			</div>
		);

		render(<App />, scratch);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(shared).toHaveBeenCalledOnce();
	});

	it('should not invoke an ancestor handler attached while an event bubbles when its function is swapped in elsewhere', () => {
		const shared = vi.fn();
		const App = ({ step }) => (
			<div onClick={step ? shared : undefined}>
				<button onClick={() => render(<App step />, scratch)} />
				<i onClick={step ? shared : () => {}} />
			</div>
		);

		render(<App />, scratch);
		fireEvent(scratch.querySelector('button'), 'click');
		expect(shared).not.toHaveBeenCalled();
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

	describe('event name casing', () => {
		it('should lowercase event names starting with an uppercase letter', () => {
			const click = vi.fn(),
				touchStart = vi.fn(),
				dblClick = vi.fn(),
				focusIn = vi.fn();

			render(
				<div
					onClick={click}
					onTouchStart={touchStart}
					onDblClick={dblClick}
					onFocusIn={focusIn}
				/>,
				scratch
			);

			expect(proto.addEventListener).toHaveBeenCalledTimes(4);
			for (const type of ['click', 'touchstart', 'dblclick', 'focusin']) {
				expect(proto.addEventListener).toHaveBeenCalledWith(
					type,
					expect.any(Function),
					false
				);
				fireEvent(scratch.firstChild, type);
			}

			expect(click).toHaveBeenCalledOnce();
			expect(touchStart).toHaveBeenCalledOnce();
			expect(dblClick).toHaveBeenCalledOnce();
			expect(focusIn).toHaveBeenCalledOnce();
		});

		it('should keep the casing of event names starting with a lowercase letter', () => {
			const click = vi.fn(),
				dblClick = vi.fn(),
				focusOut = vi.fn(),
				ionChange = vi.fn(),
				valueChanged = vi.fn();

			render(
				<div
					onclick={click}
					ondblclick={dblClick}
					onfocusout={focusOut}
					onionChange={ionChange}
					onvalueChanged={valueChanged}
				/>,
				scratch
			);

			expect(proto.addEventListener).toHaveBeenCalledTimes(5);
			for (const type of [
				'click',
				'dblclick',
				'focusout',
				'ionChange',
				'valueChanged'
			]) {
				expect(proto.addEventListener).toHaveBeenCalledWith(
					type,
					expect.any(Function),
					false
				);
			}

			// Event types are case-sensitive
			fireEvent(scratch.firstChild, 'ionchange');
			fireEvent(scratch.firstChild, 'valuechanged');
			expect(ionChange).not.toHaveBeenCalled();
			expect(valueChanged).not.toHaveBeenCalled();

			for (const type of [
				'click',
				'dblclick',
				'focusout',
				'ionChange',
				'valueChanged'
			]) {
				fireEvent(scratch.firstChild, type);
			}
			expect(click).toHaveBeenCalledOnce();
			expect(dblClick).toHaveBeenCalledOnce();
			expect(focusOut).toHaveBeenCalledOnce();
			expect(ionChange).toHaveBeenCalledOnce();
			expect(valueChanged).toHaveBeenCalledOnce();
		});

		it('should register differently cased props as separate listeners', () => {
			const lower = vi.fn(),
				upper = vi.fn();

			render(<div onvalueChanged={lower} onValueChanged={upper} />, scratch);

			expect(proto.addEventListener).toHaveBeenCalledWith(
				'valueChanged',
				expect.any(Function),
				false
			);
			expect(proto.addEventListener).toHaveBeenCalledWith(
				'valuechanged',
				expect.any(Function),
				false
			);

			fireEvent(scratch.firstChild, 'valueChanged');
			expect(lower).toHaveBeenCalledOnce();
			expect(upper).not.toHaveBeenCalled();

			fireEvent(scratch.firstChild, 'valuechanged');
			expect(lower).toHaveBeenCalledOnce();
			expect(upper).toHaveBeenCalledOnce();
		});

		it('should keep props for the same event independent', () => {
			const upper = vi.fn(),
				lower = vi.fn();

			render(<div onClick={upper} onclick={lower} />, scratch);
			fireEvent(scratch.firstChild, 'click');
			expect(upper).toHaveBeenCalledOnce();
			expect(lower).toHaveBeenCalledOnce();

			render(<div onClick={upper} />, scratch);
			fireEvent(scratch.firstChild, 'click');
			expect(upper).toHaveBeenCalledTimes(2);
			expect(lower).toHaveBeenCalledOnce();
		});

		it('should lowercase PascalCase custom event names', () => {
			const myEvent = vi.fn();

			render(<div onMyEvent={myEvent} />, scratch);

			expect(proto.addEventListener).toHaveBeenCalledWith(
				'myevent',
				expect.any(Function),
				false
			);

			fireEvent(scratch.firstChild, 'MyEvent');
			expect(myEvent).not.toHaveBeenCalled();

			fireEvent(scratch.firstChild, 'myevent');
			expect(myEvent).toHaveBeenCalledOnce();
		});

		it('should support capturing custom event names', () => {
			const calls = [];

			render(
				<div
					onClickCapture={() => calls.push('clickCapture')}
					onClick={() => calls.push('click')}
					onionChangeCapture={() => calls.push('ionChangeCapture')}
					onionChange={() => calls.push('ionChange')}
				>
					<span />
				</div>,
				scratch
			);

			expect(proto.addEventListener).toHaveBeenCalledWith(
				'click',
				expect.any(Function),
				true
			);
			expect(proto.addEventListener).toHaveBeenCalledWith(
				'ionChange',
				expect.any(Function),
				true
			);
			expect(proto.addEventListener).toHaveBeenCalledWith(
				'ionChange',
				expect.any(Function),
				false
			);

			fireEvent(scratch.firstChild.firstChild, 'ionchange');
			expect(calls).to.deep.equal([]);

			fireEvent(scratch.firstChild.firstChild, 'click');
			fireEvent(scratch.firstChild.firstChild, 'ionChange');
			expect(calls).to.deep.equal([
				'clickCapture',
				'click',
				'ionChangeCapture',
				'ionChange'
			]);
		});

		it('should update and remove listeners with preserved casing', () => {
			const first = vi.fn(),
				second = vi.fn();

			const App = ({ fn }) => (
				<div
					onionChange={fn && (() => fn('ionChange'))}
					onionChangeCapture={fn && (() => fn('ionChangeCapture'))}
					onvalueChanged={fn && (() => fn('valueChanged'))}
					onTouchStart={fn && (() => fn('touchstart'))}
				/>
			);

			render(<App fn={first} />, scratch);
			expect(proto.addEventListener).toHaveBeenCalledTimes(4);

			proto.addEventListener.mockClear();
			render(<App fn={second} />, scratch);
			// Swapping handlers doesn't touch the DOM listeners
			expect(proto.addEventListener).not.toHaveBeenCalled();
			expect(proto.removeEventListener).not.toHaveBeenCalled();

			const dom = scratch.firstChild;
			fireEvent(dom, 'ionChange');
			fireEvent(dom, 'valueChanged');
			fireEvent(dom, 'touchstart');
			expect(first).not.toHaveBeenCalled();
			expect(second.mock.calls).to.deep.equal([
				['ionChangeCapture'],
				['ionChange'],
				['valueChanged'],
				['touchstart']
			]);

			second.mockClear();
			render(<App />, scratch);

			expect(proto.removeEventListener).toHaveBeenCalledTimes(4);
			for (const [type, capture] of [
				['ionChange', false],
				['ionChange', true],
				['valueChanged', false],
				['touchstart', false]
			]) {
				expect(proto.removeEventListener).toHaveBeenCalledWith(
					type,
					expect.any(Function),
					capture
				);
			}

			fireEvent(dom, 'ionChange');
			fireEvent(dom, 'valueChanged');
			fireEvent(dom, 'touchstart');
			expect(second).not.toHaveBeenCalled();
		});

		it('should listen for camelCase custom events on custom elements', () => {
			if (!customElements.get('x-event-casing')) {
				customElements.define(
					'x-event-casing',
					class extends HTMLElement {
						fire(type) {
							this.dispatchEvent(new CustomEvent(type, { bubbles: true }));
						}
					}
				);
			}

			const ionChange = vi.fn(),
				valueChanged = vi.fn(),
				click = vi.fn(),
				parentIonChange = vi.fn();

			render(
				<div onionChange={parentIonChange}>
					<x-event-casing
						onionChange={ionChange}
						onvalueChanged={valueChanged}
						onClick={click}
					/>
				</div>,
				scratch
			);

			const el = scratch.firstChild.firstChild;
			el.fire('ionchange');
			el.fire('valuechanged');
			expect(ionChange).not.toHaveBeenCalled();
			expect(valueChanged).not.toHaveBeenCalled();

			el.fire('ionChange');
			el.fire('valueChanged');
			el.click();
			expect(ionChange).toHaveBeenCalledOnce();
			expect(parentIonChange).toHaveBeenCalledOnce();
			expect(valueChanged).toHaveBeenCalledOnce();
			expect(click).toHaveBeenCalledOnce();
		});
	});
});
