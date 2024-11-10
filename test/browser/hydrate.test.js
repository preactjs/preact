import { createElement, hydrate, Fragment, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
import {
	setupScratch,
	teardown,
	sortAttributes,
	serializeHtml,
	spyOnElementAttributes,
	createEvent
} from '../_util/helpers';
import { ul, li, div } from '../_util/dom';
import { logCall, clearLog, getLog } from '../_util/logCall';

/** @jsx createElement */

describe('hydrate()', () => {
	/** @type {HTMLElement} */
	let scratch;
	let attributesSpy;

	const List = ({ children }) => <ul>{children}</ul>;
	const ListItem = ({ children, onClick = null }) => (
		<li onClick={onClick}>{children}</li>
	);

	let resetAppendChild;
	let resetInsertBefore;
	let resetRemove;
	let resetRemoveText;
	let resetRemoveComment;
	let resetSetAttribute;
	let resetRemoveAttribute;
	let rerender;

	before(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemove = logCall(Element.prototype, 'remove');
		resetRemoveComment = logCall(Comment.prototype, 'remove');
		resetRemoveText = logCall(Text.prototype, 'remove');
		resetSetAttribute = logCall(Element.prototype, 'setAttribute');
		resetRemoveAttribute = logCall(Element.prototype, 'removeAttribute');
	});

	after(() => {
		resetAppendChild();
		resetInsertBefore();
		resetRemove();
		resetRemoveText();
		resetSetAttribute();
		resetRemoveAttribute();
		resetRemoveComment();
	});

	beforeEach(() => {
		rerender = setupRerender();
		scratch = setupScratch();
		attributesSpy = spyOnElementAttributes();
		clearLog();
	});

	afterEach(() => {
		teardown(scratch);
	});

	// Test for preactjs/preact#4340
	it('should respect defaultValue in hydrate', () => {
		scratch.innerHTML = '<input value="foo">';
		hydrate(<input defaultValue="foo" />, scratch);
		expect(scratch.firstChild.value).to.equal('foo');
	});

	it('should respect defaultChecked in hydrate', () => {
		scratch.innerHTML = '<input checked="true">';
		hydrate(<input defaultChecked />, scratch);
		expect(scratch.firstChild.checked).to.equal(true);
	});

	it('should reuse existing DOM', () => {
		const onClickSpy = sinon.spy();
		const html = ul([li('1'), li('2'), li('3')]);

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<ul>
				<li>1</li>
				<li>2</li>
				<li onClick={onClickSpy}>3</li>
			</ul>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
		expect(onClickSpy).not.to.have.been.called;

		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));

		expect(onClickSpy).to.have.been.called.calledOnce;
	});

	it('should skip comment nodes between dom nodes', () => {
		scratch.innerHTML = '<p><i>0</i><!-- c --><b>1</b></p>';
		hydrate(
			<p>
				<i>0</i>
				<b>1</b>
			</p>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<p><i>0</i><b>1</b></p>');
		expect(getLog()).to.deep.equal(['Comment.remove()']);
	});

	it('should reuse existing DOM when given components', () => {
		const onClickSpy = sinon.spy();
		const html = ul([li('1'), li('2'), li('3')]);

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem onClick={onClickSpy}>3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
		expect(onClickSpy).not.to.have.been.called;

		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));

		expect(onClickSpy).to.have.been.called.calledOnce;
	});

	it('should properly set event handlers to existing DOM when given components', () => {
		const proto = Element.prototype;
		sinon.spy(proto, 'addEventListener');

		const clickHandlers = [sinon.spy(), sinon.spy(), sinon.spy()];

		const html = ul([li('1'), li('2'), li('3')]);

		scratch.innerHTML = html;
		clearLog();

		hydrate(
			<List>
				<ListItem onClick={clickHandlers[0]}>1</ListItem>
				<ListItem onClick={clickHandlers[1]}>2</ListItem>
				<ListItem onClick={clickHandlers[2]}>3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
		expect(proto.addEventListener).to.have.been.calledThrice;
		expect(clickHandlers[2]).not.to.have.been.called;

		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(clickHandlers[2]).to.have.been.calledOnce;
	});

	it('should add missing nodes to existing DOM when hydrating', () => {
		const html = ul([li('1')]);

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

		expect(scratch.innerHTML).to.equal(ul([li('1'), li('2'), li('3')]));
		expect(getLog()).to.deep.equal([
			'<li>.appendChild(#text)',
			'<ul>1.appendChild(<li>2)',
			'<li>.appendChild(#text)',
			'<ul>12.appendChild(<li>3)'
		]);
	});

	it('should remove extra nodes from existing DOM when hydrating', () => {
		const html = ul([li('1'), li('2'), li('3'), li('4')]);

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

		expect(scratch.innerHTML).to.equal(ul([li('1'), li('2'), li('3')]));
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

		// IE11 doesn't support spying on Element.prototype
		if (!/Trident/.test(navigator.userAgent)) {
			expect(attributesSpy.get).to.not.have.been.called;
		}

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
		const html = ul([li('1'), li('2'), li('3'), li('4')]);

		scratch.innerHTML = html;
		clearLog();

		const clickHandlers = [sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy()];

		hydrate(
			<List>
				<ListItem onClick={clickHandlers[0]}>1</ListItem>
				<Fragment>
					<ListItem onClick={clickHandlers[1]}>2</ListItem>
					<ListItem onClick={clickHandlers[2]}>3</ListItem>
				</Fragment>
				<ListItem onClick={clickHandlers[3]}>4</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
		expect(clickHandlers[2]).not.to.have.been.called;

		scratch
			.querySelector('li:nth-child(3)')
			.dispatchEvent(createEvent('click'));

		expect(clickHandlers[2]).to.have.been.called.calledOnce;
	});

	it('should correctly hydrate root Fragments', () => {
		const html = [
			ul([li('1'), li('2'), li('3'), li('4')]),
			div('sibling')
		].join('');

		scratch.innerHTML = html;
		clearLog();

		const clickHandlers = [
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy()
		];

		hydrate(
			<Fragment>
				<List>
					<Fragment>
						<ListItem onClick={clickHandlers[0]}>1</ListItem>
						<ListItem onClick={clickHandlers[1]}>2</ListItem>
					</Fragment>
					<ListItem onClick={clickHandlers[2]}>3</ListItem>
					<ListItem onClick={clickHandlers[3]}>4</ListItem>
				</List>
				<div onClick={clickHandlers[4]}>sibling</div>
			</Fragment>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
		expect(clickHandlers[2]).not.to.have.been.called;

		scratch
			.querySelector('li:nth-child(3)')
			.dispatchEvent(createEvent('click'));

		expect(clickHandlers[2]).to.have.been.calledOnce;
		expect(clickHandlers[4]).not.to.have.been.called;

		scratch.querySelector('div').dispatchEvent(createEvent('click'));

		expect(clickHandlers[2]).to.have.been.calledOnce;
		expect(clickHandlers[4]).to.have.been.calledOnce;
	});

	it('should override incorrect pre-existing DOM with VNodes passed into render', () => {
		const initialHtml = [
			div('sibling'),
			ul([li('1'), li('4'), li('3'), li('2')])
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
			ul([li('1'), li('2'), li('3'), li('4')]),
			div('sibling')
		].join('');

		expect(scratch.innerHTML).to.equal(finalHtml);
		expect(getLog()).to.deep.equal([
			'<div>sibling1234.insertBefore(<ul>1234, <div>sibling)'
		]);
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
		// IE11 doesn't support spies on built-in prototypes
		if (!/Trident/.test(navigator.userAgent)) {
			expect(attributesSpy.get).to.not.have.been.called;
		}
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

	// #2237
	it('should not redundantly add text nodes', () => {
		scratch.innerHTML = '<div id="test"><p>hello bar</p></div>';
		const element = document.getElementById('test');
		const Component = props => <p>hello {props.foo}</p>;

		hydrate(<Component foo="bar" />, element);
		expect(element.innerHTML).to.equal('<p>hello bar</p>');
	});

	it('should not remove values', () => {
		scratch.innerHTML =
			'<select><option value="0">Zero</option><option selected value="2">Two</option></select>';
		const App = () => {
			const options = [
				{
					value: '0',
					label: 'Zero'
				},
				{
					value: '2',
					label: 'Two'
				}
			];

			return (
				<select value="2">
					{options.map(({ disabled, label, value }) => (
						<option key={label} disabled={disabled} value={value}>
							{label}
						</option>
					))}
				</select>
			);
		};

		hydrate(<App />, scratch);
		expect(sortAttributes(scratch.innerHTML)).to.equal(
			sortAttributes(
				'<select><option value="0">Zero</option><option selected="" value="2">Two</option></select>'
			)
		);
	});

	it('should deopt for trees introduced in hydrate (append)', () => {
		scratch.innerHTML = '<div id="test"><p class="hi">hello bar</p></div>';
		const Component = props => <p class="hi">hello {props.foo}</p>;
		const element = document.getElementById('test');
		hydrate(
			<Fragment>
				<Component foo="bar" />
				<Component foo="baz" />
			</Fragment>,
			element
		);
		expect(element.innerHTML).to.equal(
			'<p class="hi">hello bar</p><p class="hi">hello baz</p>'
		);
	});

	it('should deopt for trees introduced in hydrate (insert before)', () => {
		scratch.innerHTML = '<div id="test"><p class="hi">hello bar</p></div>';
		const Component = props => <p class="hi">hello {props.foo}</p>;
		const element = document.getElementById('test');
		hydrate(
			<Fragment>
				<Component foo="baz" />
				<Component foo="bar" />
			</Fragment>,
			element
		);
		expect(element.innerHTML).to.equal(
			'<p class="hi">hello baz</p><p class="hi">hello bar</p>'
		);
	});

	it('should skip comment nodes', () => {
		scratch.innerHTML = '<p>hello <!-- c -->foo</p>';
		hydrate(<p>hello {'foo'}</p>, scratch);
		expect(scratch.innerHTML).to.equal('<p>hello foo</p>');
		expect(getLog()).to.deep.equal(['Comment.remove()']);
	});

	it('should skip over multiple comment nodes', () => {
		scratch.innerHTML = '<p>hello <!-- a --><!-- b -->foo</p>';
		hydrate(<p>hello {'foo'}</p>, scratch);
		expect(scratch.innerHTML).to.equal('<p>hello foo</p>');
		expect(getLog()).to.deep.equal(['Comment.remove()', 'Comment.remove()']);
	});

	it('should work with error boundaries', () => {
		scratch.innerHTML = '<div>Hello, World!</div>';
		class Root extends Component {
			constructor() {
				super();
				this.state = {};
			}

			componentDidCatch(error) {
				this.setState({ error });
			}

			render() {
				if (!this.state.error) {
					return <App />;
				} else {
					return <div>Error!</div>;
				}
			}
		}

		function App() {
			throw Error();
			return createElement('div', {}, 'Hello, World!');
		}

		hydrate(<Root />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Error!</div>');
	});
});
