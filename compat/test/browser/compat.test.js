import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';

import React from 'preact/compat'; // eslint-disable-line

describe('imported compat in preact', () => {

	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should patch events', () => {
		let spy = sinon.spy();
		render(<div onClick={spy} />, scratch);
		scratch.firstChild.click();

		expect(spy).to.be.calledOnce;
		expect(spy.args[0][0]).to.haveOwnProperty('persist');
		expect(spy.args[0][0]).to.haveOwnProperty('nativeEvent');
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

	it('should normalize class+className even on components', () => {
		function Foo(props) {
			return <div class={props.class} className={props.className}>foo</div>;
		}
		render(<Foo class="foo" />, scratch);
		expect(scratch.firstChild.className).to.equal('foo');
		render(null, scratch);

		render(<Foo className="foo" />, scratch);
		expect(scratch.firstChild.className).to.equal('foo');
	});
});
