import { createElement, render, Component } from 'preact';
import {
	setupScratch,
	teardown,
	supportsPassiveEvents
} from '../_util/helpers';
import { setupRerender } from 'preact/test-utils';

/** @jsx createElement */

describe('event handling', () => {
	let scratch, proto, rerender;

	function fireEvent(on, type) {
		let e = document.createEvent('Event');
		e.initEvent(type, true, true);
		on.dispatchEvent(e);
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		proto = document.createElement('div').constructor.prototype;

		sinon.spy(proto, 'addEventListener');
		sinon.spy(proto, 'removeEventListener');
	});

	afterEach(() => {
		teardown(scratch);

		proto.addEventListener.restore();
		proto.removeEventListener.restore();
	});

	it('should only register on* functions as handlers', () => {
		let click = () => {},
			onclick = () => {};

		render(<div click={click} onClick={onclick} />, scratch);

		expect(scratch.childNodes[0].attributes.length).to.equal(0);

		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'click',
			sinon.match.func,
			false
		);
	});

	it('should only register truthy values as handlers', () => {
		function fooHandler() {}
		const falsyHandler = false;

		render(<div onClick={falsyHandler} onOtherClick={fooHandler} />, scratch);

		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'OtherClick',
			sinon.match.func,
			false
		);

		expect(proto.addEventListener).not.to.have.been.calledWith('Click');
		expect(proto.addEventListener).not.to.have.been.calledWith('click');
	});

	it('should support native event names', () => {
		let click = sinon.spy(),
			mousedown = sinon.spy();

		render(<div onclick={() => click(1)} onmousedown={mousedown} />, scratch);

		expect(proto.addEventListener)
			.to.have.been.calledTwice.and.to.have.been.calledWith('click')
			.and.calledWith('mousedown');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).to.have.been.calledOnce.and.calledWith(1);
	});

	it('should support camel-case event names', () => {
		let click = sinon.spy(),
			mousedown = sinon.spy();

		render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);

		expect(proto.addEventListener)
			.to.have.been.calledTwice.and.to.have.been.calledWith('click')
			.and.calledWith('mousedown');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).to.have.been.calledOnce.and.calledWith(1);
	});

	it('should update event handlers', () => {
		let click1 = sinon.spy();
		let click2 = sinon.spy();

		render(<div onClick={click1} />, scratch);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click1).to.have.been.calledOnce;
		expect(click2).to.not.have.been.called;

		click1.resetHistory();
		click2.resetHistory();

		render(<div onClick={click2} />, scratch);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click1).to.not.have.been.called;
		expect(click2).to.have.been.called;
	});

	it('should remove event handlers', () => {
		let click = sinon.spy(),
			mousedown = sinon.spy();

		render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);
		render(<div onClick={() => click(2)} />, scratch);

		expect(proto.removeEventListener).to.have.been.calledWith('mousedown');

		fireEvent(scratch.childNodes[0], 'mousedown');
		expect(mousedown).not.to.have.been.called;

		proto.removeEventListener.resetHistory();
		click.resetHistory();
		mousedown.resetHistory();

		render(<div />, scratch);

		expect(proto.removeEventListener).to.have.been.calledWith('click');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).not.to.have.been.called;
	});

	it('should register events not appearing on dom nodes', () => {
		let onAnimationEnd = () => {};

		render(<div onanimationend={onAnimationEnd} />, scratch);
		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'animationend',
			sinon.match.func,
			false
		);
	});

	it('should support controlled inputs', () => {
		const calls = [];
		class Input extends Component {
			constructor(props) {
				super(props);
				this.state = { text: '' };
				this.onInput = this.onInput.bind(this);
			}

			onInput(e) {
				calls.push(e.target.value);
				if (e.target.value.length > 3) return;
				this.setState({ text: e.target.value });
			}

			render() {
				return <input onInput={this.onInput} value={this.state.text} />;
			}
		}

		render(<Input />, scratch);

		scratch.firstChild.value = 'hii';
		fireEvent(scratch.firstChild, 'input');
		rerender();
		expect(calls).to.deep.equal(['hii']);
		expect(scratch.firstChild.value).to.equal('hii');

		scratch.firstChild.value = 'hiii';
		fireEvent(scratch.firstChild, 'input');
		rerender();
		expect(calls).to.deep.equal(['hii', 'hiii']);
		expect(scratch.firstChild.value).to.equal('hii');
	});

	it('should support controlled checkboxes', () => {
		const calls = [];
		class Input extends Component {
			constructor(props) {
				super(props);
				this.state = { checked: true };
				this.onInput = this.onInput.bind(this);
			}

			onInput(e) {
				calls.push(e.target.checked);
				if (e.target.checked === false) return;
				this.setState({ checked: e.target.checked });
			}

			render() {
				return (
					<input
						type="checkbox"
						onChange={this.onInput}
						checked={this.state.checked}
					/>
				);
			}
		}

		render(<Input />, scratch);

		scratch.firstChild.checked = false;
		fireEvent(scratch.firstChild, 'change');
		rerender();
		expect(calls).to.deep.equal([false]);
		expect(scratch.firstChild.checked).to.equal(true);
	});

	// Skip test if browser doesn't support passive events
	if (supportsPassiveEvents()) {
		it('should use capturing for event props ending with *Capture', () => {
			let click = sinon.spy(),
				focus = sinon.spy();

			render(
				<div onClickCapture={click} onFocusCapture={focus}>
					<button />
				</div>,
				scratch
			);

			let root = scratch.firstChild;
			root.firstElementChild.click();
			root.firstElementChild.focus();

			expect(click, 'click').to.have.been.calledOnce;

			// Focus delegation requires a 50b hack I'm not sure we want to incur
			expect(focus, 'focus').to.have.been.calledOnce;

			// IE doesn't set it
			if (!/Edge/.test(navigator.userAgent)) {
				expect(click).to.have.been.calledWithMatch({ eventPhase: 0 }); // capturing
				expect(focus).to.have.been.calledWithMatch({ eventPhase: 0 }); // capturing
			}
		});

		it('should support both capturing and non-capturing events on the same element', () => {
			let click = sinon.spy(),
				clickCapture = sinon.spy();

			render(
				<div onClick={click} onClickCapture={clickCapture}>
					<button />
				</div>,
				scratch
			);

			let root = scratch.firstChild;
			root.firstElementChild.click();

			expect(clickCapture, 'click').to.have.been.calledOnce;
			expect(click, 'click').to.have.been.calledOnce;
		});
	}
});
