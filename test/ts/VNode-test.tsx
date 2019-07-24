import "mocha";
import { expect } from "chai";
import {
	createElement,
	Component,
	FunctionalComponent,
	ComponentConstructor,
	ComponentFactory
} from "../../src";

class SimpleComponent extends Component<{}, {}> {
	render() {
		return (
			<div>{this.props.children}</div>
		);
	}
}

const SimpleFunctionalComponent = () => <div />;

const a: ComponentFactory = SimpleComponent;
const b: ComponentFactory = SimpleFunctionalComponent;

describe("VNode", () => {
	it("is returned by h", () => {
		const actual = <div className="wow"/>;
		expect(actual).to.include.all.keys(
			"type", "props", "key"
		);
	});

	it("has a nodeName of string when html element", () => {
		const div = <div>Hi!</div>;
		expect(div.type).to.equal("div");
	});

	it("has a nodeName equal to the construction function when SFC", () => {
		const sfc = <SimpleFunctionalComponent />;
		expect(sfc.type).to.be.instanceOf(Function);
		const constructor = sfc.type as FunctionalComponent<any>;
		expect(constructor.name).to.eq("SimpleFunctionalComponent");
	});

	it("has a nodeName equal to the constructor of a component", () => {
		const sfc = <SimpleComponent />;
		expect(sfc.type).to.be.instanceOf(Function);
		const constructor = sfc.type as ComponentConstructor<any>;
		expect(constructor.name).to.eq("SimpleComponent");
	});

	it("has children which is an array of string or other vnodes", () => {
		const comp = (
			<SimpleComponent>
				<SimpleComponent>child1</SimpleComponent>
				child2
			</SimpleComponent>
		);

		expect(comp.props.children).to.be.instanceOf(Array);
		expect(comp.props.children[1]).to.be.a("string");
	});
});

class ComponentWithFunctionChild extends Component<{ children: (num: number) => string; }> {
	render() { return null; }
}

<ComponentWithFunctionChild>{num => num.toFixed(2)}</ComponentWithFunctionChild>;

class ComponentWithStringChild extends Component<{ children: string; }> {
	render() { return null; }
}

<ComponentWithStringChild>child</ComponentWithStringChild>;

class ComponentWithNumberChild extends Component<{ children: number; }> {
	render() { return null; }
}

<ComponentWithNumberChild>{1}</ComponentWithNumberChild>;

class ComponentWithBooleanChild extends Component<{ children: boolean; }> {
	render() { return null; }
}

<ComponentWithBooleanChild>{false}</ComponentWithBooleanChild>;

class ComponentWithNullChild extends Component<{ children: null; }> {
	render() { return null; }
}

<ComponentWithNullChild>{null}</ComponentWithNullChild>;

class ComponentWithNumberChildren extends Component<{ children: number[]; }> {
	render() { return null; }
}

<ComponentWithNumberChildren>{1}{2}</ComponentWithNumberChildren>;
