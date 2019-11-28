import { render } from 'preact';
import {
	setupScratch,
	teardown,
	createEvent
} from '../../../test/_util/helpers';

import React, { createElement } from 'preact/compat';

describe('preact/compat events', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	let proto;

	beforeEach(() => {
		scratch = setupScratch();

		proto = Element.prototype;
		sinon.spy(proto, 'addEventListener');
		sinon.spy(proto, 'removeEventListener');
	});

	afterEach(() => {
		teardown(scratch);

		proto.addEventListener.restore();
		proto.removeEventListener.restore();
	});

	it('should patch events', () => {
		let spy = sinon.spy();
		render(<div onClick={spy} />, scratch);
		scratch.firstChild.click();

		expect(spy).to.be.calledOnce;
		const event = spy.args[0][0];
		expect(event).to.haveOwnProperty('persist');
		expect(event).to.haveOwnProperty('nativeEvent');
		expect(typeof event.persist).to.equal('function');

		expect(() => event.persist()).to.not.throw();
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

	it('should not normalize onChange for range', () => {
		render(<input type="range" onChange={() => null} />, scratch);
		expect(proto.addEventListener).to.have.been.calledOnce;
		expect(proto.addEventListener).to.have.been.calledWithExactly(
			'change',
			sinon.match.func,
			false
		);
		expect(proto.addEventListener).not.to.have.been.calledWith('input');
	});

	it('should support onAnimationEnd', () => {
		const func = sinon.spy(() => {});
		render(<div onAnimationEnd={func} />, scratch);

		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'animationend',
			sinon.match.func,
			false
		);

		scratch.firstChild.dispatchEvent(createEvent('animationend'));
		expect(func).to.have.been.calledOnce;

		render(<div />, scratch);
		expect(
			proto.removeEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'animationend',
			sinon.match.func,
			false
		);
	});

	it('should support onTouch* events', () => {
		const onTouchStart = () => {};
		const onTouchEnd = () => {};
		const onTouchMove = () => {};
		const onTouchCancel = () => {};

		render(
			<div
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
				onTouchMove={onTouchMove}
				onTouchCancel={onTouchCancel}
			/>,
			scratch
		);

		expect(proto.addEventListener.args.length).to.eql(4);
		expect(proto.addEventListener.args[0].length).to.eql(3);
		expect(proto.addEventListener.args[0][0]).to.eql('touchstart');
		expect(proto.addEventListener.args[0][2]).to.eql(false);
		expect(proto.addEventListener.args[1].length).to.eql(3);
		expect(proto.addEventListener.args[1][0]).to.eql('touchend');
		expect(proto.addEventListener.args[1][2]).to.eql(false);
		expect(proto.addEventListener.args[2].length).to.eql(3);
		expect(proto.addEventListener.args[2][0]).to.eql('touchmove');
		expect(proto.addEventListener.args[2][2]).to.eql(false);
		expect(proto.addEventListener.args[3].length).to.eql(3);
		expect(proto.addEventListener.args[3][0]).to.eql('touchcancel');
		expect(proto.addEventListener.args[3][2]).to.eql(false);

		expect(scratch.firstChild._listeners).to.deep.equal({
			touchstart: onTouchStart,
			touchend: onTouchEnd,
			touchmove: onTouchMove,
			touchcancel: onTouchCancel
		});

		render(<div />, scratch);

		expect(proto.removeEventListener.args.length).to.eql(4);
		expect(proto.removeEventListener.args[0].length).to.eql(3);
		expect(proto.removeEventListener.args[0][0]).to.eql('touchstart');
		expect(proto.removeEventListener.args[0][2]).to.eql(false);
		expect(proto.removeEventListener.args[1].length).to.eql(3);
		expect(proto.removeEventListener.args[1][0]).to.eql('touchend');
		expect(proto.removeEventListener.args[1][2]).to.eql(false);
		expect(proto.removeEventListener.args[2].length).to.eql(3);
		expect(proto.removeEventListener.args[2][0]).to.eql('touchmove');
		expect(proto.removeEventListener.args[2][2]).to.eql(false);
		expect(proto.removeEventListener.args[3].length).to.eql(3);
		expect(proto.removeEventListener.args[3][0]).to.eql('touchcancel');
		expect(proto.removeEventListener.args[3][2]).to.eql(false);
	});

	it('should support onTransitionEnd', () => {
		const func = sinon.spy(() => {});
		render(<div onTransitionEnd={func} />, scratch);

		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'transitionend',
			sinon.match.func,
			false
		);

		scratch.firstChild.dispatchEvent(createEvent('transitionend'));
		expect(func).to.have.been.calledOnce;

		render(<div />, scratch);
		expect(
			proto.removeEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'transitionend',
			sinon.match.func,
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
		let spy = sinon.spy();
		render(<input onBeforeInput={spy} />, scratch);
		scratch.firstChild.dispatchEvent(createEvent('beforeinput'));
		expect(spy).to.be.calledOnce;
	});
});
