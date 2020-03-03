import { createElement, hydrate, Fragment, Component } from 'preact';
import { Suspense } from 'preact/compat';
import { useState } from 'preact/hooks';
import {
	setupScratch,
	teardown,
	sortAttributes,
	serializeHtml
} from '../_util/helpers';
import { ul, li, div } from '../_util/dom';
import { logCall, clearLog, getLog } from '../_util/logCall';
import { setupRerender } from 'preact/test-utils';

/** @jsx createElement */

describe('hydrate()', () => {
	let scratch;
	let rerender;

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
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
		clearLog();
	});

	it('should reuse existing DOM', () => {
		const html = ul([li('1'), li('2'), li('3')]);

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
		const html = ul([li('1'), li('2'), li('3')]);

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
			ul([li('1'), li('2'), li('3'), li('4')]),
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

	// #2237
	it('should not redundantly add text nodes', () => {
		scratch.innerHTML = '<div id="test"><p>hello bar</p></div>';
		const element = document.getElementById('test');
		const Component = props => <p>hello {props.foo}</p>;

		hydrate(<Component foo="bar" />, element);
		expect(element.innerHTML).to.equal('<p>hello bar</p>');
	});

	describe('Progressive Hydration', () => {
		beforeEach(() => {
			scratch.observer = new MutationObserver(() => {});
			scratch.observer.observe(scratch, {
				subtree: true,
				childList: true,
				attributes: true,
				attributeOldValue: true,
				characterData: true,
				characterDataOldValue: true
			});
		});

		afterEach(() => {
			if (scratch.observer) scratch.observer.disconnect();
			scratch.observer = null;
		});

		it('should preserve DOM for caught exceptions during hydration', () => {
			scratch.innerHTML = '<div id="test"><p>inner</p><p>after</p></div>';
			scratch.observer.takeRecords(); // ignore
			let outerInstance;
			let shouldThrow = true;
			function Inner() {
				if (shouldThrow) {
					throw {};
				}
				return <p>inner</p>;
			}
			class Outer extends Component {
				constructor(props, context) {
					super(props, context);
					outerInstance = this;
				}
				componentDidCatch() {}
				render() {
					return <Inner />;
				}
			}
			function App() {
				return (
					<div id="test">
						<Outer />
						<p>after</p>
					</div>
				);
			}
			const componentDidCatch = sinon.spy(Outer.prototype, 'componentDidCatch');
			hydrate(<App />, scratch);
			expect(componentDidCatch).to.have.been.calledOnce;
			componentDidCatch.resetHistory();
			// our instance of Outer()
			const firstOuterInstance = outerInstance;
			expect(outerInstance).to.exist;
			expect(outerInstance.base).to.equal(scratch.firstChild.firstChild);
			expect(outerInstance._vnode._dom).to.equal(scratch.firstChild.firstChild);

			expect(scratch.observer.takeRecords()).to.have.length(
				0,
				'no DOM mutations'
			);

			// now re-render and see if we hydrate:
			shouldThrow = false;
			outerInstance.forceUpdate();
			rerender();
			expect(componentDidCatch).not.to.have.been.called;
			expect(outerInstance).to.equal(
				firstOuterInstance,
				'Resumption should reuse component instances'
			);

			expect(scratch.innerHTML).to.equal(
				'<div id="test"><p>inner</p><p>after</p></div>'
			);
			expect(scratch.observer.takeRecords()).to.have.length(
				0,
				'no DOM mutations'
			);

			// it should work repeatedly:
			outerInstance.forceUpdate();
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<div id="test"><p>inner</p><p>after</p></div>'
			);
			expect(scratch.observer.takeRecords()).to.have.length(
				0,
				'no DOM mutations'
			);
		});

		it('should preserve DOM for nested exceptions when resuming from suspended hydration', () => {
			const HTML =
				'<div id="test"><p><span>inner</span>outer</p><p>after</p></div>';
			scratch.innerHTML = HTML;
			scratch.observer.takeRecords(); // ignore

			// Similar to @preact-cli/async-component
			const wrap = () =>
				class Wrap extends Component {
					componentDidCatch() {}
					render(props) {
						Wrap.instance = this;
						return props.children;
					}
				};

			let shouldThrowOuter = true;
			function Outer(props) {
				if (shouldThrowOuter) throw {};
				return <p>{props.children}</p>;
			}
			const OuterWrap = wrap();

			let shouldThrowInner = true;
			function Inner(props) {
				if (shouldThrowInner) throw {};
				return <span>{props.children}</span>;
			}
			const InnerWrap = wrap();

			function App() {
				return (
					<div id="test">
						<OuterWrap>
							<Outer>
								<InnerWrap>
									<Inner>inner</Inner>
								</InnerWrap>
								outer
							</Outer>
						</OuterWrap>
						<p>after</p>
					</div>
				);
			}
			const componentDidCatchOuter = sinon.spy(
				OuterWrap.prototype,
				'componentDidCatch'
			);
			const componentDidCatchInner = sinon.spy(
				InnerWrap.prototype,
				'componentDidCatch'
			);
			hydrate(<App />, scratch);
			expect(componentDidCatchOuter).to.have.been.calledOnce;
			expect(componentDidCatchInner).not.to.have.been.called;
			// our instance of Outer()
			const firstOuterInstance = OuterWrap.instance;
			expect(firstOuterInstance).to.exist;
			expect(firstOuterInstance.base).to.equal(scratch.firstChild.firstChild);
			expect(firstOuterInstance._vnode._dom).to.equal(
				scratch.firstChild.firstChild
			);

			expect(scratch.observer.takeRecords()).to.have.length(
				0,
				'[outer] no DOM mutations'
			);

			componentDidCatchOuter.resetHistory();

			// now re-render and let the inner component suspend:
			console.log('un-suspending Outer');
			shouldThrowOuter = false;
			OuterWrap.instance.forceUpdate();
			rerender();
			expect(componentDidCatchOuter).not.to.have.been.called;
			expect(componentDidCatchInner).to.have.been.calledOnce;
			expect(OuterWrap.instance).to.equal(
				firstOuterInstance,
				'[outer] Resumption should reuse component instances'
			);

			const firstInnerInstance = InnerWrap.instance;
			expect(firstInnerInstance).to.exist;
			expect(firstInnerInstance.base).to.equal(
				scratch.firstChild.firstChild.firstChild
			);
			expect(firstInnerInstance._vnode._dom).to.equal(
				scratch.firstChild.firstChild.firstChild
			);

			expect(scratch.innerHTML).to.equal(
				HTML,
				'[outer] Resumption should preserve DOM tree'
			);
			expect(scratch.observer.takeRecords()).to.have.length(
				0,
				'no DOM mutations'
			);

			componentDidCatchInner.resetHistory();

			// now re-render the inner component to finish hydration:
			console.log('un-suspending Inner');
			shouldThrowInner = false;
			// OuterWrap.instance.forceUpdate();
			InnerWrap.instance.forceUpdate();
			rerender();
			expect(componentDidCatchOuter).not.to.have.been.called;
			expect(componentDidCatchInner).not.to.have.been.called;
			expect(InnerWrap.instance).to.equal(
				firstInnerInstance,
				'[inner] Resumption should reuse component instances'
			);

			expect(scratch.innerHTML).to.equal(
				HTML,
				'[inner] Resumption should preserve DOM tree'
			);
			expect(scratch.observer.takeRecords()).to.have.length(
				0,
				'no DOM mutations'
			);

			/*
			// it should also update fine from the root
			console.log('re-rendering from Outer');
			OuterWrap.instance.forceUpdate();
			rerender();
			expect(componentDidCatchOuter).not.to.have.been.called;
			expect(componentDidCatchInner).not.to.have.been.called;
			expect(InnerWrap.instance).to.equal(firstInnerInstance, '[inner] Resumption should reuse component instances');

			expect(scratch.innerHTML).to.equal(HTML, '[inner] Resumption should preserve DOM tree');
			expect(scratch.observer.takeRecords()).to.have.length(0, 'no DOM mutations');
			*/
		});

		it('should reuse suspended markup when suspense resolves during hydration', () => {
			scratch.innerHTML =
				'<div id="test"><p>hello bar</p><p>Hello foo</p></div>';
			const element = scratch;
			let resolver;
			const Component = () => {
				const [state, setState] = useState(false);
				if (!state) {
					throw new Promise(resolve => {
						resolver = () => {
							setState(true);
							resolve();
						};
					});
				} else {
					return <p>hello bar</p>;
				}
			};
			const App = () => {
				return (
					<div id="test">
						<Suspense fallback={<div>baz</div>}>
							<Component />
						</Suspense>
						<p>Hello foo</p>
					</div>
				);
			};
			hydrate(<App />, element);
			rerender();
			expect(element.innerHTML).to.equal(
				'<div id="test"><p>hello bar</p><p>Hello foo</p></div>'
			);
			const removeChildSpy = sinon.spy(element.firstChild, 'removeChild');
			resolver();
			rerender();
			expect(removeChildSpy).to.be.not.called;
			expect(element.innerHTML).to.equal(
				'<div id="test"><p>hello bar</p><p>Hello foo</p></div>'
			);
		});
	});
});
