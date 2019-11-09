import React, {
	render,
	createElement,
	cloneElement,
	findDOMNode,
	Component,
	unmountComponentAtNode,
	createFactory,
	unstable_batchedUpdates
} from 'preact/compat';
import { createElement as preactH } from 'preact';
import {
	setupScratch,
	teardown,
	createEvent
} from '../../../test/_util/helpers';

let ce = type => document.createElement(type);
let text = text => document.createTextNode(text);

describe('preact-compat', () => {
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

	describe('render()', () => {
		it('should be exported', () => {
			expect(React)
				.to.have.property('render')
				.that.is.a('function')
				.that.equals(render);
		});

		it('should replace isomorphic content', () => {
			let root = ce('div');
			let initialChild = ce('div');
			initialChild.appendChild(text('initial content'));
			root.appendChild(initialChild);

			render(<div>dynamic content</div>, root);
			expect(root)
				.to.have.property('textContent')
				.that.is.a('string')
				.that.equals('dynamic content');
		});

		it('should remove extra elements', () => {
			let root = ce('div');
			let inner = ce('div');

			root.appendChild(inner);

			let c1 = ce('div');
			c1.appendChild(text('isomorphic content'));
			inner.appendChild(c1);

			let c2 = ce('div');
			c2.appendChild(text('extra content'));
			inner.appendChild(c2);

			render(<div>dynamic content</div>, root);
			expect(root)
				.to.have.property('textContent')
				.that.is.a('string')
				.that.equals('dynamic content');
		});

		// Note: Replacing text nodes inside the root itself is currently unsupported.
		// We do replace them everywhere else, though.
		it('should remove text nodes', () => {
			let root = ce('div');

			let div = ce('div');
			root.appendChild(div);
			div.appendChild(text('Text Content'));
			div.appendChild(text('More Text Content'));

			render(<div>dynamic content</div>, root);
			expect(root)
				.to.have.property('textContent')
				.that.is.a('string')
				.that.equals('dynamic content');
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

		it('should support defaultValue', () => {
			render(<input defaultValue="foo" />, scratch);
			expect(scratch.firstElementChild).to.have.property('value', 'foo');
		});

		it('should ignore defaultValue when value is 0', () => {
			render(<input defaultValue={2} value={0} />, scratch);
			expect(scratch.firstElementChild.value).to.equal('0');
		});

		it('should call the callback', () => {
			let spy = sinon.spy();
			render(<div />, scratch, spy);
			expect(spy).to.be.calledOnce;
			expect(spy).to.be.calledWithExactly();
		});

		// Issue #1727
		it('should destroy the any existing DOM nodes inside the container', () => {
			scratch.appendChild(document.createElement('div'));
			scratch.appendChild(document.createElement('div'));

			render(<span>foo</span>, scratch);
			expect(scratch.innerHTML).to.equal('<span>foo</span>');
		});

		it('should only destroy existing DOM nodes on first render', () => {
			scratch.appendChild(document.createElement('div'));
			scratch.appendChild(document.createElement('div'));

			render(<input />, scratch);

			let child = scratch.firstChild;
			child.focus();
			render(<input />, scratch);
			expect(document.activeElement.nodeName).to.equal('INPUT');
		});
	});

	describe('createFactory', () => {
		it('should create a DOM element', () => {
			render(createFactory('span')({ class: 'foo' }, '1'), scratch);
			expect(scratch.innerHTML).to.equal('<span class="foo">1</span>');
		});

		it('should create a component', () => {
			const Foo = ({ id, children }) => <div id={id}>foo {children}</div>;
			render(createFactory(Foo)({ id: 'value' }, 'bar'), scratch);
			expect(scratch.innerHTML).to.equal('<div id="value">foo bar</div>');
		});
	});

	describe('createElement()', () => {
		it('should be exported', () => {
			expect(React)
				.to.have.property('createElement')
				.that.is.a('function')
				.that.equals(createElement);
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

	describe('Component', () => {
		it('should be exported', () => {
			expect(React)
				.to.have.property('Component')
				.that.is.a('function')
				.that.equals(Component);
		});
	});

	describe('cloneElement', () => {
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

	describe('findDOMNode()', () => {
		class Helper extends React.Component {
			render({ something }) {
				if (something == null) return null;
				if (something === false) return null;
				return <div />;
			}
		}

		it.skip('should return DOM Node if render is not false nor null', () => {
			const helper = React.render(<Helper />, scratch);
			expect(findDOMNode(helper)).to.be.instanceof(Node);
		});

		it('should return null if given null', () => {
			expect(findDOMNode(null)).to.be.null;
		});

		it('should return a regular DOM Element if given a regular DOM Element', () => {
			let scratch = document.createElement('div');
			expect(findDOMNode(scratch)).to.equalNode(scratch);
		});

		// NOTE: React.render() returning false or null has the component pointing
		// 			to no DOM Node, in contrast, Preact always render an empty Text DOM Node.
		it('should return null if render returns false', () => {
			const helper = React.render(<Helper something={false} />, scratch);
			expect(findDOMNode(helper)).to.be.null;
		});

		// NOTE: React.render() returning false or null has the component pointing
		// 			to no DOM Node, in contrast, Preact always render an empty Text DOM Node.
		it('should return null if render returns null', () => {
			const helper = React.render(<Helper something={null} />, scratch);
			expect(findDOMNode(helper)).to.be.null;
		});
	});

	describe('unmountComponentAtNode', () => {
		it('should unmount a root node', () => {
			const App = () => <div>foo</div>;
			render(<App />, scratch);

			expect(unmountComponentAtNode(scratch)).to.equal(true);
			expect(scratch.innerHTML).to.equal('');
		});

		it('should do nothing if root is not mounted', () => {
			expect(unmountComponentAtNode(scratch)).to.equal(false);
			expect(scratch.innerHTML).to.equal('');
		});
	});

	describe('unstable_batchedUpdates', () => {
		it('should call the callback', () => {
			const spy = sinon.spy();
			unstable_batchedUpdates(spy);
			expect(spy).to.be.calledOnce;
		});

		it('should call callback with only one arg', () => {
			const spy = sinon.spy();
			unstable_batchedUpdates(spy, 'foo', 'bar');
			expect(spy).to.be.calledWithExactly('foo');
		});
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
