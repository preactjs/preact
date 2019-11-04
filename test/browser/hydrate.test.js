import { createElement, hydrate, Fragment } from 'preact';
import {
	setupScratch,
	teardown,
	sortAttributes,
	serializeHtml
} from '../_util/helpers';
import { ul, li, div } from '../_util/dom';
import { logCall, clearLog, getLog } from '../_util/logCall';

/** @jsx createElement */

describe('hydrate()', () => {
	let scratch;

	const List = ({ children }) => <ul>{children}</ul>;
	const ListItem = ({ children }) => <li>{children}</li>;

	before(() => {
		logCall(Element.prototype, 'appendChild');
		logCall(Element.prototype, 'insertBefore');
		logCall(Element.prototype, 'removeChild');
		logCall(Element.prototype, 'remove');
		logCall(Element.prototype, 'setAttribute');
		logCall(Element.prototype, 'removeAttribute');
	});

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
		clearLog();
	});

	it('should reuse existing DOM', () => {
		const html = ul([li('1'), li('2'), li('3')].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<ul>
				<li>1</li>
				<li>2</li>
				<li>3</li>
			</ul>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
	});

	it('should reuse existing DOM when given components', () => {
		const html = ul([li('1'), li('2'), li('3')].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
	});

	it('should add missing nodes to existing DOM when hydrating', () => {
		const html = ul([li('1')].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(
			ul([li('1'), li('2'), li('3')].join(''))
		);
		expect(getLog()).to.deep.equal([
			'<li>.appendChild(#text)',
			'<ul>1.appendChild(<li>2)',
			'<li>.appendChild(#text)',
			'<ul>12.appendChild(<li>3)'
		]);
	});

	it('should remove extra nodes from existing DOM when hydrating', () => {
		const html = ul([li('1'), li('2'), li('3'), li('4')].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(
			ul([li('1'), li('2'), li('3')].join(''))
		);
		expect(getLog()).to.deep.equal(['<li>4.remove()']);
	});

	it('should not update attributes on existing DOM', () => {
		scratch.innerHTML =
			'<div><span before-hydrate="test" same-value="foo" different-value="a">Test</span></div>';
		let vnode = (
			<div>
				<span same-value="foo" different-value="b" new-value="c">
					Test
				</span>
			</div>
		);

		clearLog();
		hydrate(vnode, scratch);

		expect(serializeHtml(scratch)).to.equal(
			sortAttributes(
				'<div><span before-hydrate="test" different-value="a" same-value="foo">Test</span></div>'
			)
		);
		expect(getLog()).to.deep.equal([]);
	});

	it('should update class attribute via className prop', () => {
		scratch.innerHTML = '<div class="foo">bar</div>';
		hydrate(<div className="foo">bar</div>, scratch);
		expect(scratch.innerHTML).to.equal('<div class="foo">bar</div>');
	});

	it('should correctly hydrate with Fragments', () => {
		const html = ul([li('1'), li('2'), li('3'), li('4')].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<List>
				<ListItem>1</ListItem>
				<Fragment>
					<ListItem>2</ListItem>
					<ListItem>3</ListItem>
				</Fragment>
				<ListItem>4</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
	});

	it('should correctly hydrate root Fragments', () => {
		const html = [
			ul([li('1'), li('2'), li('3'), li('4')].join('')),
			div('sibling')
		].join('');

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<Fragment>
				<List>
					<Fragment>
						<ListItem>1</ListItem>
						<ListItem>2</ListItem>
					</Fragment>
					<ListItem>3</ListItem>
					<ListItem>4</ListItem>
				</List>
				<div>sibling</div>
			</Fragment>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
	});

	// Failing because the following condition in diffElementNodes doesn't evaluate to true
	// when hydrating a dom node which is not correct
	//		dom===d && newVNode.text!==oldVNode.text
	// We don't set `d` when hydrating. If we did, then newVNode.text would never equal
	// oldVNode.text since oldVNode is always EMPTY_OBJ when hydrating
	it.skip('should override incorrect pre-existing DOM with VNodes passed into render', () => {
		const initialHtml = [
			div('sibling'),
			ul([li('1'), li('4'), li('3'), li('2')].join(''))
		].join('');

		scratch.innerHTML = initialHtml;
		clearLog();

		hydrate(
			<Fragment>
				<List>
					<Fragment>
						<ListItem>1</ListItem>
						<ListItem>2</ListItem>
					</Fragment>
					<ListItem>3</ListItem>
					<ListItem>4</ListItem>
				</List>
				<div>sibling</div>
			</Fragment>,
			scratch
		);

		const finalHtml = [
			ul([li('1'), li('2'), li('3'), li('4')].join('')),
			div('sibling')
		].join('');

		expect(scratch.innerHTML).to.equal(finalHtml);
		// TODO: Fill in with proper log once this test is passing
		expect(getLog()).to.deep.equal([]);
	});

	it('should not merge attributes with node created by the DOM', () => {
		const html = htmlString => {
			const div = document.createElement('div');
			div.innerHTML = htmlString;
			return div.firstChild;
		};

		// prettier-ignore
		const DOMElement = html`<div><a foo="bar"></a></div>`;
		scratch.appendChild(DOMElement);

		const preactElement = (
			<div>
				<a />
			</div>
		);

		hydrate(preactElement, scratch);
		expect(scratch).to.have.property(
			'innerHTML',
			'<div><a foo="bar"></a></div>'
		);
	});

	it('should attach event handlers', () => {
		let spy = sinon.spy();
		scratch.innerHTML = '<span>Test</span>';
		let vnode = <span onClick={spy}>Test</span>;

		hydrate(vnode, scratch);

		scratch.firstChild.click();
		expect(spy).to.be.calledOnce;
	});
});
