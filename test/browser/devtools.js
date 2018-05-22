import { h, Component, render } from '../../src/preact';
import { initDevTools } from '../../devtools/devtools';
import { unmountComponent } from '../../src/vdom/component';

class StatefulComponent extends Component {
	constructor(props) {
		super(props);

		this.state = {count: 0};
	}

	render() {
		return h('span', {}, String(this.state.count));
	}
}

function FunctionalComponent() {
	return h('span', {class: 'functional'}, 'Functional');
}

function Label({label}) {
	return label;
}

class MultiChild extends Component {
	constructor(props) {
		super(props);
		this.state = {count: props.initialCount};
	}

	render() {
		return h('div', {}, Array(this.state.count).fill('child'));
	}
}

let describe_ = describe;
if (!('name' in Function.prototype)) {
	// Skip these tests under Internet Explorer
	describe_ = describe.skip;
}

describe_('React Developer Tools integration', () => {
	let cleanup;
	let container;
	let renderer;

	// Maps of DOM node to React*Component-like objects.
	// For composite components, there will be two instances for each node, one
	// for the composite component (instanceMap) and one for the root child DOM
	// component rendered by that component (domInstanceMap)
	let instanceMap = new Map();
	let domInstanceMap = new Map();

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);

		const onMount = instance => {
			if (instance._renderedChildren) {
				domInstanceMap.set(instance.node, instance);
			} else {
				instanceMap.set(instance.node, instance);
			}
		};

		const onUnmount = instance => {
			instanceMap.delete(instance.node);
			domInstanceMap.delete(instance.node);
		};

		global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
			inject: sinon.spy(_renderer => {
				renderer = _renderer;
				renderer.Mount._renderNewRootComponent = sinon.stub();
				renderer.Reconciler.mountComponent = sinon.spy(onMount);
				renderer.Reconciler.unmountComponent = sinon.spy(onUnmount);
				renderer.Reconciler.receiveComponent = sinon.stub();
			})
		};
		cleanup = initDevTools();
	});

	afterEach(() => {
		container.remove();
		cleanup();
	});

	it('registers preact as a renderer with the React DevTools hook', () => {
		expect(global.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject).to.be.called;
	});

	// Basic component addition/update/removal tests
	it('notifies dev tools about new components', () => {
		render(h(StatefulComponent), container);
		expect(renderer.Reconciler.mountComponent).to.be.called;
	});

	it('notifies dev tools about component updates', () => {
		const node = render(h(StatefulComponent), container);
		node._component.forceUpdate();
		expect(renderer.Reconciler.receiveComponent).to.be.called;
	});

	it('notifies dev tools when components are removed', () => {
		const node = render(h(StatefulComponent), container);
		unmountComponent(node._component, true);
		expect(renderer.Reconciler.unmountComponent).to.be.called;
	});

	// Test properties of DOM components exposed to devtools via
	// ReactDOMComponent-like instances
	it('exposes the tag name of DOM components', () => {
		const node = render(h(StatefulComponent), container);
		const domInstance = domInstanceMap.get(node);
		expect(domInstance._currentElement.type).to.equal('span');
	});

	it('exposes DOM component props', () => {
		const node = render(h(FunctionalComponent), container);
		const domInstance = domInstanceMap.get(node);
		expect(domInstance._currentElement.props.class).to.equal('functional');
	});

	it('exposes text component contents', () => {
		const node = render(h(Label, {label: 'Text content'}), container);
		const textInstance = domInstanceMap.get(node);
		expect(textInstance._stringText).to.equal('Text content');
	});

	// Test properties of composite components exposed to devtools via
	// ReactCompositeComponent-like instances
	it('exposes the name of composite component classes', () => {
		const node = render(h(StatefulComponent), container);
		expect(instanceMap.get(node).getName()).to.equal('StatefulComponent');
	});

	it('exposes composite component props', () => {
		const node = render(h(Label, {label: 'Text content'}), container);
		const instance = instanceMap.get(node);
		expect(instance._currentElement.props.label).to.equal('Text content');
	});

	it('exposes composite component state', () => {
		const node = render(h(StatefulComponent), container);

		node._component.setState({count: 42});
		node._component.forceUpdate();

		expect(instanceMap.get(node).state).to.deep.equal({count: 42});
	});

	// Test setting state via devtools
	it('updates component when setting state from devtools', () => {
		const node = render(h(StatefulComponent), container);

		instanceMap.get(node).setState({count: 10});
		instanceMap.get(node).forceUpdate();

		expect(node.textContent).to.equal('10');
	});

	// Test that the original instance is exposed via `_instance` so it can
	// be accessed conveniently via `$r` in devtools

	// Functional component handling tests
	xit('wraps functional components with stateful ones', () => {
		const vnode = h(FunctionalComponent);
		expect(vnode.nodeName.prototype).to.have.property('render');
	});

	it('exposes the name of functional components', () => {
		const node = render(h(FunctionalComponent), container);
		const instance = instanceMap.get(node);
		expect(instance.getName()).to.equal('FunctionalComponent');
	});

	xit('exposes a fallback name if the component has no useful name', () => {
		const node = render(h(() => h('div')), container);
		const instance = instanceMap.get(node);
		expect(instance.getName()).to.equal('(Function.name missing)');
	});

	// Test handling of DOM children
	it('notifies dev tools about DOM children', () => {
		const node = render(h(StatefulComponent), container);
		const domInstance = domInstanceMap.get(node);
		expect(renderer.Reconciler.mountComponent).to.have.been.calledWith(domInstance);
	});

	// TODO: This test needs to be rechecked. Previously it didn't call the
	// assertion correctly and would therefore always pass
	it.skip('notifies dev tools when a component update adds DOM children', () => {
		const node = render(h(MultiChild, {initialCount: 2}), container);

		node._component.setState({count: 4});
		node._component.forceUpdate();

		expect(renderer.Reconciler.mountComponent).to.have.been.called.callCount(2);
	});

	it('notifies dev tools when a component update modifies DOM children', () => {
		const node = render(h(StatefulComponent), container);

		instanceMap.get(node).setState({count: 10});
		instanceMap.get(node).forceUpdate();

		const textInstance = domInstanceMap.get(node.childNodes[0]);
		expect(textInstance._stringText).to.equal('10');
	});

	it('notifies dev tools when a component update removes DOM children', () => {
		const node = render(h(MultiChild, {initialCount: 1}), container);

		node._component.setState({count: 0});
		node._component.forceUpdate();

		expect(renderer.Reconciler.unmountComponent).to.be.called;
	});

	// Root component info
	it('exposes root components on the _instancesByReactRootID map', () => {
		render(h(StatefulComponent), container);
		expect(Object.keys(renderer.Mount._instancesByReactRootID).length).to.equal(1);
	});

	it('notifies dev tools when new root components are mounted', () => {
		render(h(StatefulComponent), container);
		expect(renderer.Mount._renderNewRootComponent).to.be.called;
	});

	it('removes root components when they are unmounted', () => {
		const node = render(h(StatefulComponent), container);
		unmountComponent(node._component, true);
		expect(Object.keys(renderer.Mount._instancesByReactRootID).length).to.equal(0);
	});

	it('counts root components correctly when a root renders a composite child', () => {
		function Child() {
			return h('main');
		}
		function Parent() {
			return h(Child);
		}

		render(h(Parent), container);

		expect(Object.keys(renderer.Mount._instancesByReactRootID).length).to.equal(1);
	});

	it('counts root components correctly when a native element has a composite child', () => {
		function Link() {
			return h('a');
		}
		function Root() {
			return h('div', {}, h(Link));
		}

		render(h(Root), container);

		expect(Object.keys(renderer.Mount._instancesByReactRootID).length).to.equal(1);
	});
});
