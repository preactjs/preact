import { createElement, hydrate, Fragment } from '../../src/index';
import { setupScratch, teardown, sortAttributes } from '../_util/helpers';
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
		const html = ul([
			li('1'),
			li('2'),
			li('3')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<ul>
				<li>1</li>
				<li>2</li>
				<li>3</li>
			</ul>
		), scratch);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
	});

	it('should reuse existing DOM when given components', () => {
		const html = ul([
			li('1'),
			li('2'),
			li('3')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
	});

	it('should add missing nodes to existing DOM when hydrating', () => {
		const html = ul([
			li('1')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);

		expect(scratch.innerHTML).to.equal(ul([
			li('1'),
			li('2'),
			li('3')
		].join('')));
		expect(getLog()).to.deep.equal([
			'<li>.appendChild(#text)',
			'<ul>1.appendChild(<li>2)',
			'<li>.appendChild(#text)',
			'<ul>12.appendChild(<li>3)'
		]);
	});

	it('should remove extra nodes from existing DOM when hydrating', () => {
		const html = ul([
			li('1'),
			li('2'),
			li('3'),
			li('4')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);

		expect(scratch.innerHTML).to.equal(ul([
			li('1'),
			li('2'),
			li('3')
		].join('')));
		expect(getLog()).to.deep.equal([
			'<li>4.remove()'
		]);
	});

	it('should update attributes on existing DOM', () => {
		scratch.innerHTML = '<div><span doesnt-exist="test" same-value="foo" different-value="a">Test</span></div>';
		let vnode = <div><span same-value="foo" different-value="b" new-value="c">Test</span></div>;

		clearLog();
		hydrate(vnode, scratch);

		expect(scratch.innerHTML).to.equal(sortAttributes('<div><span same-value="foo" different-value="b" new-value="c">Test</span></div>'));
		expect(getLog()).to.deep.equal([
			'<span>Test.setAttribute(different-value, b)',
			'<span>Test.setAttribute(new-value, c)',
			'<span>Test.removeAttribute(doesnt-exist)'
		]);
	});

	it('should correctly hydrate with Fragments', () => {
		const html = ul([
			li('1'),
			li('2'),
			li('3'),
			li('4')
		].join(''));

		scratch.innerHTML = html;
		clearLog();

		hydrate((
			<List>
				<ListItem>1</ListItem>
				<Fragment>
					<ListItem>2</ListItem>
					<ListItem>3</ListItem>
				</Fragment>
				<ListItem>4</ListItem>
			</List>
		), scratch);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
	});

	it('should correctly hydrate root Fragments', () => {
		const html = [
			ul([
				li('1'),
				li('2'),
				li('3'),
				li('4')
			].join('')),
			div('sibling')
		].join('');

		scratch.innerHTML = html;
		clearLog();

		hydrate((
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
			</Fragment>
		), scratch);

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
			ul([
				li('1'),
				li('4'),
				li('3'),
				li('2')
			].join(''))
		].join('');

		scratch.innerHTML = initialHtml;
		clearLog();

		hydrate((
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
			</Fragment>
		), scratch);

		const finalHtml = [
			ul([
				li('1'),
				li('2'),
				li('3'),
				li('4')
			].join('')),
			div('sibling')
		].join('');

		expect(scratch.innerHTML).to.equal(finalHtml);
		// TODO: Fill in with proper log once this test is passing
		expect(getLog()).to.deep.equal([]);
	});
});
