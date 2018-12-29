import React, {
	render,
	createClass,
	createElement,
	cloneElement,
	findDOMNode,
	Component,
	PropTypes,
	// eslint-disable-next-line camelcase
	unstable_renderSubtreeIntoContainer,
	__spread
} from '../../../src/compat';
import { setupScratch, teardown } from '../../_util/helpers';

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


	describe('createClass()', () => {
		it('should be exported', () => {
			expect(React)
				.to.have.property('createClass')
				.that.is.a('function')
				.that.equals(createClass);
		});

		it('should create a Component', () => {
			let specState = { something: 1 };
			let spec = {
				foo: 'bar',
				getInitialState() {
					return specState;
				},
				method: sinon.spy()
			};
			const C = createClass(spec);
			let inst = new C();
			expect(inst).to.have.property('foo', 'bar');
			expect(inst).to.have.property('state', specState);
			expect(inst).to.have.property('method').that.is.a('function');
			expect(inst).to.be.an.instanceof(Component);
			inst.method('a','b');
			expect(spec.method)
				.to.have.been.calledOnce
				.and.calledOn(inst)
				.and.calledWithExactly('a', 'b');
		});

		it('should not bind blacklisted methods', () => {
			let constructor = () => {};
			let render = () => null;
			const C = createClass({
				constructor,
				render
			});
			let c = new C();
			expect(c).to.have.property('constructor').that.equals(constructor);
			expect(c).to.have.property('render').not.with.property('__bound');
		});

		it('should copy statics', () => {
			let def = {
				statics: {
					foo: 'bar',
					baz() {}
				}
			};
			let c = createClass(def);
			expect(c).to.have.property('foo', def.statics.foo);
			expect(c).to.have.property('baz', def.statics.baz);
		});

		it('should support mixins', () => {
			let def = {
				mixins: [
					{
						foo: sinon.spy(),
						bar: sinon.spy()
					},
					{
						bar: sinon.spy(),
						componentWillMount: sinon.spy(),
						render: 'nothing here'
					},
					{
						componentWillMount: sinon.spy()
					}
				],
				foo: sinon.spy(),
				componentWillMount: sinon.spy(),
				render: sinon.stub().returns(null)
			};
			let C = createClass(def);
			let inst = new C();

			inst.foo();
			expect(def.foo).to.have.been.calledOnce;
			expect(def.mixins[0].foo).to.have.been.calledOnce.and.calledBefore(def.foo);

			inst.bar();
			expect(def.mixins[0].bar).to.have.been.calledOnce;
			expect(def.mixins[1].bar).to.have.been.calledOnce.and.calledAfter(def.mixins[0].bar);

			let props = {},
				state = {};
			inst.componentWillMount(props, state);
			expect(def.mixins[1].componentWillMount)
				.to.have.been.calledOnce
				.and.calledWithExactly(props, state);
			expect(def.mixins[2].componentWillMount)
				.to.have.been.calledOnce
				.and.calledWithExactly(props, state)
				.and.calledAfter(def.mixins[1].componentWillMount);

			expect(inst.render(props, state)).to.equal(null);
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
			expect(vnode.props.children[0]).to.have.property('$$typeof', $$typeof);
			expect(vnode.props.children[0]).to.have.property('type', 'a');
			expect(vnode.props.children[0]).to.have.property('props').that.is.an('object');
			expect(vnode.props.children[0].props).to.eql({ children:['t'] });
		});

		it('should normalize onChange', () => {
			let props = { onChange(){} };

			function expectToBeNormalized(vnode, desc) {
				expect(vnode, desc).to.have.property('props').with.all.keys(['oninput'].concat(vnode.props.type ? 'type' : [])).and.property('oninput').that.is.a('function');
			}

			function expectToBeUnmodified(vnode, desc) {
				expect(vnode, desc).to.have.property('props').eql({ ...props, ...(vnode.props.type ? { type: vnode.props.type } : {}) });
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

	describe('PropTypes', () => {
		it('should be exported', () => {
			expect(React)
				.to.have.property('PropTypes')
				.that.is.an('object')
				.that.equals(PropTypes);
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
			expect(clone.children[0].nodeName).to.eql('div');
		});

		it('should support children in prop argument', () => {
			let element = <foo></foo>;
			let children = [<span>b</span>];
			let clone = cloneElement(element, { children });
			expect(clone.children).to.eql(children);
		});

		it('children argument takes precedence over props.children', () => {
			let element = <foo></foo>;
			let childrenA = [<span>b</span>];
			let childrenB = [<div>c</div>];
			let clone = cloneElement(element, { children: childrenA }, ...childrenB);
			expect(clone.children).to.eql(childrenB);
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

		it('should return DOM Node if render is not false nor null', () => {
			let scratch = document.createElement('div');
			(document.body || document.documentElement).appendChild(scratch);
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

	describe('unstable_renderSubtreeIntoContainer', () => {
		class Inner extends Component {
			render() {
				return null;
			}
			getNode() {
				return 'inner';
			}
		}

		it('should export instance', () => {
			class App extends Component {
				render() {
					return null;
				}
				componentDidMount() {
					this.renderInner();
				}
				renderInner() {
					const wrapper = document.createElement('div');
					this.inner = unstable_renderSubtreeIntoContainer(this, <Inner />, wrapper);
				}
			}
			const app = render(<App />, scratch);
			expect(typeof app.inner.getNode === 'function').to.equal(true);
		});

		it('should there must be a context in callback', () => {
			class App extends Component {
				render() {
					return null;
				}
				componentDidMount() {
					this.renderInner();
				}
				renderInner() {
					const wrapper = document.createElement('div');
					const self = this;
					unstable_renderSubtreeIntoContainer(this, <Inner />, wrapper, function() {
						self.inner = this;
					});
				}
			}
			const app = render(<App />, scratch);
			expect(typeof app.inner.getNode === 'function').to.equal(true);
		});
	});

	describe('Unsupported hidden internal __spread API', () => {
		it('should work with multiple objects', () => {
			const start = {};
			const result = React.__spread(start, { one: 1, two: 3 }, { two: 2 });
			expect(result).to.equal(start);
			expect(start).to.deep.equal({ one: 1, two: 2 });
		});

		it('should be exported on default and as __spread', () => {
			expect(__spread).to.equal(React.__spread);
		});
	});
});
