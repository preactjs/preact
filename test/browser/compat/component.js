import { setupScratch, teardown, setupRerender } from '../../_util/helpers';
import React from '../../../src/compat';

describe('components', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should be sane', () => {
		let props;

		class Demo extends React.Component {
			render() {
				props = this.props;
				return <div id="demo">{this.props.children}</div>;
			}
		}

		React.render(
			<Demo a="b" c="d">inner</Demo>,
			scratch
		);

		expect(props).to.exist.and.deep.equal({
			a: 'b',
			c: 'd',
			children: 'inner'
		});

		expect(scratch.innerHTML).to.equal('<div id="demo">inner</div>');
	});

	it('should support replaceState()', done => {
		class Demo extends React.Component {
			render() {
				return <div />;
			}
		}

		sinon.spy(Demo.prototype, 'render');

		let inst;
		React.render(<Demo ref={ c => inst=c } />, scratch);
		inst.setState({ foo: 'bar', baz: 'bat' });
		rerender();

		setTimeout(() => {
			expect(inst.state).to.eql({ foo: 'bar', baz: 'bat' });

			let callbackState;
			let callback = sinon.spy(() => {
				callbackState = inst.state;
			});
			inst.replaceState({}, callback);
			rerender();

			setTimeout(() => {
				expect(callback).to.have.been.calledOnce;
				expect(callbackState).to.eql({});
				expect(inst.state).to.eql({});

				done();
			}, 10);
		}, 10);
	});

	it('should alias props.children', () => {
		class Foo extends React.Component {
			render() {
				return <div>{this.props.children}</div>;
			}
		}

		let children = ['a', <span>b</span>, <b>c</b>],
			foo;

		React.render((
			<Foo ref={ c => foo=c }>
				{ children }
			</Foo>
		), scratch);
		expect(foo.props).to.exist.and.have.property('children').eql(children);
	});

	it('should single out children before componentWillReceiveProps', () => {
		let props;

		class Child extends React.Component {
			componentWillReceiveProps(newProps) {
				props = newProps;
			}
		}

		class Parent extends React.Component {
			render() {
				return <Child>second</Child>;
			}
		}

		let a = React.render(<Parent/>, scratch);
		a.forceUpdate();

		expect(props).to.exist.and.deep.equal({
			children: 'second'
		});
	});

	it('should support array[object] children', () => {
		let children;

		class Foo extends React.Component {
			render() {
				children = this.props.children;
				return <div />;
			}
		}

		const data = [{ a: '' }];
		React.render(<Foo>{ data }</Foo>, scratch);

		expect(children).to.exist.and.deep.equal(data);
	});

	describe('getInitialState', () => {
		it('should be invoked for new components', () => {
			class Foo extends React.Component {
				getInitialState() {
					return { foo: 'bar' };
				}
				render() {
					return <div />;
				}
			}

			sinon.spy(Foo.prototype, 'getInitialState');

			let a = React.render(<Foo />, scratch);

			expect(Foo.prototype.getInitialState).to.have.been.calledOnce;
			expect(a.state).to.eql({ foo: 'bar' });
		});
	});

	describe('defaultProps', () => {
		it('should support defaultProps for components', () => {
			let render = sinon.stub().returns(<div />);

			const Foo = React.createClass({
				defaultProps: {
					foo: 'default foo',
					bar: 'default bar'
				},
				render
			});

			React.render(<Foo />, scratch);
			expect(render).to.have.been.calledWithMatch(Foo.defaultProps);

			render.resetHistory();
			React.render(<Foo bar="bar" />, scratch);
			expect(render).to.have.been.calledWithMatch({ foo:'default foo', bar:'bar' });
		});

		it('should support defaultProps for pure components', () => {
			const Foo = sinon.stub().returns(<div />);
			Foo.defaultProps = {
				foo: 'default foo',
				bar: 'default bar'
			};

			React.render(<Foo />, scratch);
			expect(Foo).to.have.been.calledWithMatch(Foo.defaultProps);

			Foo.resetHistory();
			React.render(<Foo bar="bar" />, scratch);
			expect(Foo).to.have.been.calledWithMatch({ foo:'default foo', bar:'bar' });
		});
	});

	describe('mixins', () => {
		describe('getDefaultProps', () => {
			it('should use a mixin', () => {
				const Foo = React.createClass({
					mixins: [
						{ getDefaultProps: () => ({ a: true }) }
					],
					render() {
						return <div />;
					}
				});

				expect(Foo.defaultProps).to.eql({
					a: true
				});
			});

			it('should combine the results', () => {
				const Foo = React.createClass({
					mixins: [
						{ getDefaultProps: () => ({ a: true }) },
						{ getDefaultProps: () => ({ b: true }) }
					],
					getDefaultProps() {
						return { c: true };
					},
					render() {
						return <div />;
					}
				});

				expect(Foo.defaultProps).to.eql({
					a: true,
					b: true,
					c: true
				});
			});

			it('should work with statics', () => {
				const Foo = React.createClass({
					statics: {
						a: false
					},
					getDefaultProps() {
						return { b: true, c: this.a };
					},
					render() {
						return <div />;
					}
				});

				expect(Foo.defaultProps).to.eql({
					b: true,
					c: false
				});
			});

			// Disabled to save bytes
			xit('should throw an error for duplicate keys', () => {
				expect(() => {
					const Foo = React.createClass({
						mixins: [
							{ getDefaultProps: () => ({ a: true }) }
						],
						getDefaultProps() {
							return { a: true };
						},
						render() {
							return <div />;
						}
					});
				}).to.throw();
			});
		});

		describe('getInitialState', () => {
			it('should combine the results', () => {
				const Foo = React.createClass({
					mixins: [
						{ getInitialState: () => ({ a: true }) },
						{ getInitialState: () => ({ b: true }) }
					],
					getInitialState() {
						return { c: true };
					},
					render() {
						return <div />;
					}
				});

				let a = React.render(<Foo />, scratch);

				expect(a.state).to.eql({
					a: true,
					b: true,
					c: true
				});
			});

			// Disabled to save bytes
			xit('should throw an error for duplicate keys', () => {
				const Foo = React.createClass({
					mixins: [
						{ getInitialState: () => ({ a: true }) }
					],
					getInitialState() {
						return { a: true };
					},
					render() {
						return <div />;
					}
				});

				expect(() => {
					React.render(<Foo />, scratch);
				}).to.throw();
			});
		});
	});

	describe('refs', () => {
		it('should support string refs', () => {
			let inst, innerInst;

			class Foo extends React.Component {
				constructor() {
					super();
					inst = this;
				}

				render() {
					return (
						<div ref="top">
							<h1 ref="h1">h1</h1>
							<p ref="p">
								<span ref="span">text</span>
								<Inner ref="inner" />
							</p>
						</div>
					);
				}
			}

			const Inner = React.createClass({
				render() {
					innerInst = this;
					return (
						<div className="contained" ref="contained">
							<h2 ref="inner-h2">h2</h2>
						</div>
					);
				}
			});

			React.render(<Foo />, scratch);

			expect(inst).to.exist;
			expect(inst.refs).to.be.an('object');

			expect(inst.refs).to.have.property('top', scratch.firstChild);
			expect(inst.refs).to.have.property('h1', scratch.querySelector('h1'));
			expect(inst.refs).to.have.property('p', scratch.querySelector('p'));
			expect(inst.refs).to.have.property('span', scratch.querySelector('span'));

			expect(inst.refs).to.have.property('inner', innerInst, 'ref to child component');

			expect(inst.refs).not.to.have.property('contained');
			expect(inst.refs).not.to.have.property('inner-h2');

			expect(innerInst.refs).to.have.all.keys(['contained', 'inner-h2']);
			expect(innerInst.refs).to.have.property('contained', scratch.querySelector('.contained'));
			expect(innerInst.refs).to.have.property('inner-h2', scratch.querySelector('h2'));
		});

		it('should retain support for function refs', () => {
			let ref1 = sinon.spy(),
				ref2 = sinon.spy(),
				componentRef = sinon.spy(),
				innerInst;

			class Foo extends React.Component {
				render() {
					return this.props.empty ? (<foo />) : (
						<div ref={ref1}>
							<h1 ref={ref2}>h1</h1>
							<Inner ref={componentRef} />
						</div>
					);
				}
			}

			const Inner = React.createClass({
				render() {
					innerInst = this;
					return <div />;
				}
			});

			React.render(<Foo />, scratch);

			expect(ref1).to.have.have.been.calledOnce.and.calledWith(scratch.firstChild);
			expect(ref2).to.have.have.been.calledOnce.and.calledWith(scratch.querySelector('h1'));
			expect(componentRef).to.have.been.calledOnce.and.calledWith(innerInst);

			React.render(<Foo empty />, scratch);
			// React.unmountComponentAtNode(scratch);

			expect(ref1, 'ref1').to.have.have.been.calledTwice.and.calledWith(null);
			expect(ref2, 'ref2').to.have.have.been.calledTwice.and.calledWith(null);
			expect(componentRef, 'componentRef').to.have.been.calledTwice.and.calledWith(null);
		});

		it('should support string refs via cloneElement()', () => {
			let inner, outer;

			const Inner = React.createClass({
				render() {
					inner = this;
					return (
						<div>
							{React.cloneElement(React.Children.only(this.props.children), { id:'one' })}
							{React.cloneElement(React.Children.only(this.props.children), { id:'two', ref:'two' })}
						</div>
					);
				}
			});

			const Outer = React.createClass({
				render() {
					outer = this;
					return (
						<Inner>
							<span ref="one">foo</span>
						</Inner>
					);
				}
			});

			React.render(<Outer />, scratch);

			let one = scratch.firstElementChild.children[0];
			let two = scratch.firstElementChild.children[1];
			expect(outer).to.have.property('refs').eql({ one });
			expect(inner).to.have.property('refs').eql({ two });
		});
	});

	describe('PureComponent', () => {
		it('should be a class', () => {
			expect(React).to.have.property('PureComponent').that.is.a('function');
		});

		it('should only re-render when props or state change', () => {
			class C extends React.PureComponent {
				render() {
					return <div />;
				}
			}
			let spy = sinon.spy(C.prototype, 'render');

			let inst = React.render(<C />, scratch);
			expect(spy).to.have.been.calledOnce;
			spy.resetHistory();

			inst = React.render(<C />, scratch);
			expect(spy).not.to.have.been.called;

			let b = { foo: 'bar' };
			inst = React.render(<C a="a" b={b} />, scratch);
			expect(spy).to.have.been.calledOnce;
			spy.resetHistory();

			inst = React.render(<C a="a" b={b} />, scratch);
			expect(spy).not.to.have.been.called;

			inst.setState({ });
			rerender();
			expect(spy).not.to.have.been.called;

			inst.setState({ a: 'a', b });
			rerender();
			expect(spy).to.have.been.calledOnce;
			spy.resetHistory();

			inst.setState({ a: 'a', b });
			rerender();
			expect(spy).not.to.have.been.called;
		});
	});
});
