import React, { createElement, render } from 'preact/compat';
import {
	setupScratch,
	teardown,
	createEvent
} from '../../../test/_util/helpers';

describe('compat createElement()', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should normalize vnodes', () => {
		let vnode = (
			<div a="b">
				<a>t</a>
			</div>
		);
		let $$typeof = 0xeac7;
		try {
			// eslint-disable-next-line
			if (
				Function.prototype.toString
					.call(eval('Symbol.for'))
					.match(/\[native code\]/)
			) {
				// eslint-disable-next-line
				$$typeof = eval('Sym' + 'bol.for("react.element")');
			}
		} catch (e) {}
		expect(vnode).to.have.property('$$typeof', $$typeof);
		expect(vnode).to.have.property('type', 'div');
		expect(vnode)
			.to.have.property('props')
			.that.is.an('object');
		expect(vnode.props).to.have.property('children');
		expect(vnode.props.children).to.have.property('$$typeof', $$typeof);
		expect(vnode.props.children).to.have.property('type', 'a');
		expect(vnode.props.children)
			.to.have.property('props')
			.that.is.an('object');
		expect(vnode.props.children.props).to.eql({ children: 't' });
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
