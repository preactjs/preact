import { h, render, options } from '../../src/preact';
/** @jsx h */

describe('nativeScript option', () => {
	let scratch;

	before( () => {
		options.nativeScript = true;
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
		options.nativeScript = false;
	});

	it('should only register on* functions as handlers', () => {
		let textChanged = () => {}, onTextChanged = () => {};
		let proto = document.createElement('div').constructor.prototype;

		sinon.spy(proto, 'addEventListener');

		render(<div textChanged={ textChanged } onTextChanged={ onTextChanged } />, scratch);

		expect(scratch.childNodes[0]).to.have.deep.property('attributes.length', 0);

		expect(proto.addEventListener).to.have.been.calledOnce
			.and.to.have.been.calledWithExactly('textChanged', sinon.match.func, scratch.childNodes[0]);

		proto.addEventListener.restore();
	});

	it('should add and remove event handlers', () => {
		let click = sinon.spy(),
			mousedown = sinon.spy();

		let proto = document.createElement('div').constructor.prototype;
		sinon.spy(proto, 'addEventListener');
		sinon.spy(proto, 'removeEventListener');

		function fireEvent(on, type) {
			let e = document.createEvent('Event');
			e.initEvent(type, true, true);
			e.eventName = type;
			on.dispatchEvent(e);
		}

		render(<div onTap={ () => click(1) } onTextChanged={ mousedown } />, scratch);

		expect(proto.addEventListener).to.have.been.calledTwice
			.and.to.have.been.calledWith('tap')
			.and.calledWith('textChanged');

		fireEvent(scratch.childNodes[0], 'tap');
		expect(click).to.have.been.calledOnce
			.and.calledWith(1);

		proto.addEventListener.reset();
		click.reset();

		render(<div onTap={ () => click(2) } />, scratch, scratch.firstChild);

		expect(proto.addEventListener).not.to.have.been.called;

		expect(proto.removeEventListener)
			.to.have.been.calledOnce
			.and.calledWith('textChanged');

		fireEvent(scratch.childNodes[0], 'tap');
		expect(click).to.have.been.calledOnce
			.and.to.have.been.calledWith(2);

		fireEvent(scratch.childNodes[0], 'textChanged');
		expect(mousedown).not.to.have.been.called;

		proto.removeEventListener.reset();
		click.reset();
		mousedown.reset();

		render(<div />, scratch, scratch.firstChild);

		expect(proto.removeEventListener)
			.to.have.been.calledOnce
			.and.calledWith('tap');

		fireEvent(scratch.childNodes[0], 'tap');
		expect(click).not.to.have.been.called;

		proto.addEventListener.restore();
		proto.removeEventListener.restore();
	});
});
