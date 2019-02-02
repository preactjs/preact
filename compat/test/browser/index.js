import React, {
	render,
	createElement,
	cloneElement,
	findDOMNode,
	Component
} from '../../src';
import { setupScratch, teardown } from '../../../test/_util/helpers';

let ce = type => document.createElement(type);
let text = text => document.createTextNode(text);

describe('preact-compat', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
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

			let c1 = ce('div');
			c1.appendChild(text('isomorphic content'));
			root.appendChild(c1);

			let c2 = ce('div');
			c2.appendChild(text('extra content'));
			root.appendChild(c2);

			render(<div>dynamic content</div>, root);
			expect(root)
				.to.have.property('textContent')
				.that.is.a('string')
				.that.equals('dynamic content');
		});

		it('should remove text nodes', () => {
			let root = ce('div');

			root.appendChild(text('Text Content in the root'));
			root.appendChild(text('More Text Content'));

			render(<div>dynamic content</div>, root);
			expect(root)
				.to.have.property('textContent')
				.that.is.a('string')
				.that.equals('dynamic content');
		});

		it('should support defaultValue', () => {
			render(<input defaultValue="foo"></input>, scratch);
			expect(scratch.firstElementChild).to.have.property('value', 'foo');
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
			let vnode = <div a="b"><a>t</a></div>;
			let $$typeof = 0xeac7;
			try {
				// eslint-disable-next-line
				if (Function.prototype.toString.call(eval('Sym'+'bol.for')).match(/\[native code\]/)) {
					// eslint-disable-next-line
					$$typeof = eval('Sym'+'bol.for("react.element")');
				}
			}
			catch (e) {}
			expect(vnode).to.have.property('$$typeof', $$typeof);
			expect(vnode).to.have.property('type', 'div');
			expect(vnode).to.have.property('props').that.is.an('object');
			expect(vnode.props).to.have.property('children');
			expect(vnode.props.children).to.have.property('$$typeof', $$typeof);
			expect(vnode.props.children).to.have.property('type', 'a');
			expect(vnode.props.children).to.have.property('props').that.is.an('object');
			expect(vnode.props.children.props).to.eql({ children: 't' });
		});

		it('should normalize onChange', () => {
			let props = { onChange(){} };

			function expectToBeNormalized(vnode, desc) {
				expect(vnode, desc)
					.to.have.property('props')
					.with.all.keys(['oninput'].concat(vnode.props.type ? 'type' : []))
					.and.property('oninput').that.is.a('function');
			}

			function expectToBeUnmodified(vnode, desc) {
				expect(vnode, desc).to.have.property('props').eql({
					...props,
					...(vnode.props.type ? { type: vnode.props.type } : {})
				});
			}

			expectToBeUnmodified(<div {...props} />, '<div>');
			expectToBeUnmodified(<input {...props} type="radio" />, '<input type="radio">');
			expectToBeUnmodified(<input {...props} type="checkbox" />, '<input type="checkbox">');
			expectToBeUnmodified(<input {...props} type="file" />, '<input type="file">');

			expectToBeNormalized(<textarea {...props} />, '<textarea>');
			expectToBeNormalized(<input {...props} />, '<input>');
			expectToBeNormalized(<input {...props} type="text" />, '<input type="text">');

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
			let element = <foo a="b" c="d">a<span>b</span></foo>;
			expect(cloneElement(element)).to.eql(element);
		});

		it('should support props.children', () => {
			let element = <foo children={<span>b</span>}></foo>;
			let clone = cloneElement(element);
			expect(clone).to.eql(element);
			expect(cloneElement(clone).props.children).to.eql(element.props.children);
		});

		it('children take precedence over props.children', () => {
			let element = <foo children={<span>c</span>}><div>b</div></foo>;
			let clone = cloneElement(element);
			expect(clone).to.eql(element);
			expect(clone.props.children.type).to.eql('div');
		});

		it('should support children in prop argument', () => {
			let element = <foo></foo>;
			let children = [<span>b</span>];
			let clone = cloneElement(element, { children });
			expect(clone.props.children).to.eql(children);
		});

		it('children argument takes precedence over props.children', () => {
			let element = <foo></foo>;
			let childrenA = [<span>b</span>];
			let childrenB = [<div>c</div>];
			let clone = cloneElement(element, { children: childrenA }, ...childrenB);
			expect(clone.props.children).to.eql(childrenB);
		});

		it('children argument takes precedence over props.children even if falsey', () => {
			let element = <foo></foo>;
			let childrenA = [<span>b</span>];
			let clone = cloneElement(element, { children: childrenA }, undefined);
			expect(clone.children).to.eql(undefined);
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
		}),

		it('should return a regular DOM Element if given a regular DOM Element', () => {
			let scratch = document.createElement('div');
			expect(findDOMNode(scratch)).to.equal(scratch);
		}),

		// NOTE: React.render() returning false or null has the component pointing
		// 			to no DOM Node, in contrast, Preact always render an empty Text DOM Node.
		xit('should return null if render returns false', () => {
			const helper = React.render(<Helper something={false} />, scratch);
			expect(findDOMNode(helper)).to.be.null;
		});

		// NOTE: React.render() returning false or null has the component pointing
		// 			to no DOM Node, in contrast, Preact always render an empty Text DOM Node.
		xit('should return null if render returns null', () => {
			const helper = React.render(<Helper something={null} />, scratch);
			expect(findDOMNode(helper)).to.be.null;
		});
	});
});
