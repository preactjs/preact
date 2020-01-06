import 'mocha';
import { expect } from 'chai';
import {
	createElement,
	Component,
	toChildArray,
	FunctionalComponent,
	ComponentConstructor,
	ComponentFactory,
	VNode,
	ComponentChildren,
	cloneElement
} from '../../';

function getDisplayType(vnode: VNode | string | number) {
	if (typeof vnode === 'string' || typeof vnode == 'number') {
		return vnode.toString();
	} else if (typeof vnode.type == 'string') {
		return vnode.type;
	} else {
		return vnode.type.displayName;
	}
}

class SimpleComponent extends Component<{}, {}> {
	render() {
		return <div>{this.props.children}</div>;
	}
}

const SimpleFunctionalComponent = () => <div />;

const a: ComponentFactory = SimpleComponent;
const b: ComponentFactory = SimpleFunctionalComponent;

describe('VNode TS types', () => {
	it('is returned by h', () => {
		const actual = <div className="wow" />;
		expect(actual).to.include.all.keys('type', 'props', 'key');
	});

	it('has a nodeName of string when html element', () => {
		const div = <div>Hi!</div>;
		expect(div.type).to.equal('div');
	});

	it('has a nodeName equal to the construction function when SFC', () => {
		const sfc = <SimpleFunctionalComponent />;
		expect(sfc.type).to.be.instanceOf(Function);
		const constructor = sfc.type as FunctionalComponent<any>;
		expect(constructor.name).to.eq('SimpleFunctionalComponent');
	});

	it('has a nodeName equal to the constructor of a component', () => {
		const sfc = <SimpleComponent />;
		expect(sfc.type).to.be.instanceOf(Function);
		const constructor = sfc.type as ComponentConstructor<any>;
		expect(constructor.name).to.eq('SimpleComponent');
	});

	it('has children which is an array of string or other vnodes', () => {
		const comp = (
			<SimpleComponent>
				<SimpleComponent>child1</SimpleComponent>
				child2
			</SimpleComponent>
		);

		expect(comp.props.children).to.be.instanceOf(Array);
		expect(comp.props.children[1]).to.be.a('string');
	});

	it('children type should work with toChildArray', () => {
		const comp: VNode = <SimpleComponent>child1 {1}</SimpleComponent>;

		const children = toChildArray(comp.props.children);
		expect(children).to.have.lengthOf(2);
	});

	it('toChildArray should filter out some types', () => {
		const compChild = <SimpleComponent />;
		const comp: VNode = (
			<SimpleComponent>
				a{null}
				{true}
				{false}
				{2}
				{undefined}
				{['b', 'c']}
				{compChild}
			</SimpleComponent>
		);

		const children = toChildArray(comp.props.children);
		expect(children).to.deep.equal(['a', 2, 'b', 'c', compChild]);
	});

	it('functions like getDisplayType should work', () => {
		function TestComp(props: { children?: ComponentChildren }) {
			return <div>{props.children}</div>;
		}
		TestComp.displayName = 'TestComp';

		const compChild = <TestComp />;
		const comp: VNode = (
			<SimpleComponent>
				a{null}
				{true}
				{false}
				{2}
				{undefined}
				{['b', 'c']}
				{compChild}
			</SimpleComponent>
		);

		const types = toChildArray(comp.props.children).map(getDisplayType);
		expect(types).to.deep.equal(['a', '2', 'b', 'c', 'TestComp']);
	});

	it('component should work with cloneElement', () => {
		const comp: VNode = (
			<SimpleComponent>
				<div>child 1</div>
			</SimpleComponent>
		);
		const clone: VNode = cloneElement(comp);

		expect(comp.type).to.equal(clone.type);
		expect(comp.props).not.to.equal(clone.props);
		expect(comp.props).to.deep.equal(clone.props);
	});

	it('component should work with cloneElement using generics', () => {
		const comp: VNode<string> = <SimpleComponent></SimpleComponent>;
		const clone: VNode<string> = cloneElement<string>(comp);

		expect(comp.type).to.equal(clone.type);
		expect(comp.props).not.to.equal(clone.props);
		expect(comp.props).to.deep.equal(clone.props);
	});
});

class ComponentWithFunctionChild extends Component<{
	children: (num: number) => string;
}> {
	render() {
		return null;
	}
}

<ComponentWithFunctionChild>
	{num => num.toFixed(2)}
</ComponentWithFunctionChild>;

class ComponentWithStringChild extends Component<{ children: string }> {
	render() {
		return null;
	}
}

<ComponentWithStringChild>child</ComponentWithStringChild>;

class ComponentWithNumberChild extends Component<{ children: number }> {
	render() {
		return null;
	}
}

<ComponentWithNumberChild>{1}</ComponentWithNumberChild>;

class ComponentWithBooleanChild extends Component<{ children: boolean }> {
	render() {
		return null;
	}
}

<ComponentWithBooleanChild>{false}</ComponentWithBooleanChild>;

class ComponentWithNullChild extends Component<{ children: null }> {
	render() {
		return null;
	}
}

<ComponentWithNullChild>{null}</ComponentWithNullChild>;

class ComponentWithNumberChildren extends Component<{ children: number[] }> {
	render() {
		return null;
	}
}

<ComponentWithNumberChildren>
	{1}
	{2}
</ComponentWithNumberChildren>;
