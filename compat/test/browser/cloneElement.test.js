import { createElement as preactH } from 'preact';
import React, { createElement, render, cloneElement } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('compat cloneElement', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should clone elements', () => {
		let element = (
			<foo a="b" c="d">
				a<span>b</span>
			</foo>
		);
		expect(cloneElement(element)).to.eql(element);
	});

	it('should support props.children', () => {
		let element = <foo children={<span>b</span>} />;
		let clone = cloneElement(element);
		expect(clone).to.eql(element);
		expect(cloneElement(clone).props.children).to.eql(element.props.children);
	});

	it('children take precedence over props.children', () => {
		let element = (
			<foo children={<span>c</span>}>
				<div>b</div>
			</foo>
		);
		let clone = cloneElement(element);
		expect(clone).to.eql(element);
		expect(clone.props.children.type).to.eql('div');
	});

	it('should support children in prop argument', () => {
		let element = <foo />;
		let children = [<span>b</span>];
		let clone = cloneElement(element, { children });
		expect(clone.props.children).to.eql(children);
	});

	it('children argument takes precedence over props.children', () => {
		let element = <foo />;
		let childrenA = [<span>b</span>];
		let childrenB = [<div>c</div>];
		let clone = cloneElement(element, { children: childrenA }, ...childrenB);
		expect(clone.props.children).to.eql(childrenB);
	});

	it('children argument takes precedence over props.children even if falsey', () => {
		let element = <foo />;
		let childrenA = [<span>b</span>];
		let clone = cloneElement(element, { children: childrenA }, undefined);
		expect(clone.children).to.eql(undefined);
	});

	it('should skip cloning on invalid element', () => {
		let element = { foo: 42 };
		let clone = cloneElement(element);
		expect(clone).to.eql(element);
	});

	it('should work with jsx constructor from core', () => {
		function Foo(props) {
			return <div>{props.value}</div>;
		}

		let clone = cloneElement(preactH(Foo), { value: 'foo' });
		render(clone, scratch);
		expect(scratch.textContent).to.equal('foo');
	});
});
