import React, { render, createElement } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('preact/compat', () => {
	/** @type {HTMLDivElement} */
	let scratch, proto;

	beforeEach(() => {
		scratch = setupScratch();
		proto = document.createElement('div').constructor.prototype;
		sinon.spy(proto, 'addEventListener');
		sinon.spy(proto, 'removeEventListener');
	});

	afterEach(() => {
		proto.addEventListener.restore();
		proto.removeEventListener.restore();
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

	it('should not normalize onChange for range', () => {
		render(<input type="range" onChange={() => null} />, scratch);
		expect(scratch.firstChild._listeners).to.haveOwnProperty('change');
		expect(scratch.firstChild._listeners).to.not.haveOwnProperty('input');
	});

	it('should normalize class+className even on components', () => {
		function Foo(props) {
			return (
				<div class={props.class} className={props.className}>
					foo
				</div>
			);
		}
		render(<Foo class="foo" />, scratch);
		expect(scratch.firstChild.className).to.equal('foo');
		render(null, scratch);

		render(<Foo className="foo" />, scratch);
		expect(scratch.firstChild.className).to.equal('foo');
	});
});
