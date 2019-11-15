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

		proto = document.createElement('div').constructor.prototype;
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
		expect(scratch.firstChild._listeners).to.haveOwnProperty('change');
		expect(scratch.firstChild._listeners).to.not.haveOwnProperty('input');
	});

	it('should support onAnimationEnd', () => {
		const func = () => {};
		render(<div onAnimationEnd={func} />, scratch);

		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'animationend',
			sinon.match.func,
			false
		);

		expect(scratch.firstChild._listeners).to.deep.equal({
			animationend: func
		});

		render(<div />, scratch);
		expect(
			proto.removeEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'animationend',
			sinon.match.func,
			false
		);
	});

	it('should support onTransitionEnd', () => {
		const func = () => {};
		render(<div onTransitionEnd={func} />, scratch);

		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'transitionend',
			sinon.match.func,
			false
		);

		expect(scratch.firstChild._listeners).to.deep.equal({
			transitionend: func
		});

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
