import { h, render, rerender, Component } from '../../src/preact';
/** @jsx h */

describe('Lifecycle methods', () => {
	let scratch;

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

  describe('#componentWillUpdate', function () {
    it('should NOT be called on initial render', function () {
      class ReceivePropsComponent extends Component {
  			componentWillUpdate() {}
  			render() {
  				return <div />;
  			}
  		}
      sinon.spy(ReceivePropsComponent.prototype, 'componentWillUpdate');
      render(<ReceivePropsComponent />, scratch);
      expect(ReceivePropsComponent.prototype.componentWillUpdate)
  			.not.to.have.been.called;
    });
    it('should be called when rerender with new props from parent', function () {
      let doRender;
      class Outer extends Component {
        constructor() {
          super();
          this.state = { i: 0 };
        }
  			componentDidMount() {
  				doRender = () => this.setState({ i: this.state.i + 1 });
  			}
  			render(props, { i }) {
  				return <Inner i={i} {...props} />;
  			}
  		}
      class Inner extends Component {
        componentWillUpdate(nextProps, nextState) {
          expect(nextProps).to.be.deep.equal({i: 1});
          expect(nextState).to.be.deep.equal({});
        }
  			render() {
          return <div />;
  			}
  		}
      sinon.spy(Inner.prototype, 'componentWillUpdate');

      // Initial render
      render(<Outer />, scratch);
      expect(Inner.prototype.componentWillUpdate)
  			.not.to.have.been.called;

      // Rerender inner with new props
      doRender();
      rerender();
      expect(Inner.prototype.componentWillUpdate)
        .to.have.been.called;
    });
    it('should be called on new state', function () {
      let doRender;
      class ReceivePropsComponent extends Component {
        componentWillUpdate() {}
        componentDidMount() {
          doRender = () => this.setState({ i: this.state.i + 1 });
        }
        render() {
          return <div />;
        }
      }
      sinon.spy(ReceivePropsComponent.prototype, 'componentWillUpdate');
      render(<ReceivePropsComponent />, scratch);
      expect(ReceivePropsComponent.prototype.componentWillUpdate)
        .not.to.have.been.called;

      doRender();
      rerender();
      expect(ReceivePropsComponent.prototype.componentWillUpdate)
        .to.have.been.called;
    });
  });

  describe('#componentWillReceiveProps', function () {
    it('should NOT be called on initial render', function () {
      class ReceivePropsComponent extends Component {
  			componentWillReceiveProps() {}
  			render() {
  				return <div />;
  			}
  		}
      sinon.spy(ReceivePropsComponent.prototype, 'componentWillReceiveProps');
      render(<ReceivePropsComponent />, scratch);
      expect(ReceivePropsComponent.prototype.componentWillReceiveProps)
  			.not.to.have.been.called;
    });
    it('should be called when rerender with new props from parent', function () {
      let doRender;
      class Outer extends Component {
        constructor() {
          super();
          this.state = { i: 0 };
        }
  			componentDidMount() {
  				doRender = () => this.setState({ i: this.state.i + 1 });
  			}
  			render(props, { i }) {
  				return <Inner i={i} {...props} />;
  			}
  		}
      class Inner extends Component {
        componentWillMount() {
          expect(this.props.i).to.be.equal(0);
        }
  			componentWillReceiveProps(nextProps) {
          expect(nextProps.i).to.be.equal(1);
        }
  			render() {
          return <div />;
  			}
  		}
      sinon.spy(Inner.prototype, 'componentWillReceiveProps');

      // Initial render
      render(<Outer />, scratch);
      expect(Inner.prototype.componentWillReceiveProps)
  			.not.to.have.been.called;

      // Rerender inner with new props
      doRender();
      rerender();
      expect(Inner.prototype.componentWillReceiveProps)
        .to.have.been.called;
    });
    it('should be called in right execution order', function () {
      let doRender;
      class Outer extends Component {
        constructor() {
          super();
          this.state = { i: 0 };
        }
  			componentDidMount() {
  				doRender = () => this.setState({ i: this.state.i + 1 });
  			}
  			render(props, { i }) {
  				return <Inner i={i} {...props} />;
  			}
  		}
      class Inner extends Component {
        componentDidUpdate() {
          expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
          expect(Inner.prototype.componentWillUpdate).to.have.been.called;
        }
  			componentWillReceiveProps(nextProps) {
          expect(Inner.prototype.componentWillUpdate).not.to.have.been.called;
          expect(Inner.prototype.componentDidUpdate).not.to.have.been.called;
        }
        componentWillUpdate() {
          expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
          expect(Inner.prototype.componentDidUpdate).not.to.have.been.called;
        }
  			render() {
          return <div />;
  			}
  		}
      sinon.spy(Inner.prototype, 'componentWillReceiveProps');
      sinon.spy(Inner.prototype, 'componentDidUpdate');
      sinon.spy(Inner.prototype, 'componentWillUpdate');

      render(<Outer />, scratch);
      doRender();
      rerender();

      expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
      expect(Inner.prototype.componentWillUpdate).to.have.been.called;
      expect(Inner.prototype.componentDidUpdate).to.have.been.called;
    });
  });
});
