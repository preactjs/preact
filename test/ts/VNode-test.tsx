import "mocha";
import { expect } from "chai";
import {
	h,
	Component,
	FunctionalComponent,
	ComponentConstructor,
	VNode
} from "../../src/preact";

class SimpleComponent extends Component<{}, {}> {
	render() {
		return (
			<div>{this.props.children}</div>
		);
	}
}

const SimpleFunctionalComponent = () => <div />;

describe("VNode", () => {
	it("is returned by h", () => {
		const actual = <div className="wow"/>;
		expect(Object.keys(actual)).to.have.members([
			"nodeName", "attributes", "children", "key"
		]);
	});

	it("has a nodeName of string when html element", () => {
		const div = <div>Hi!</div>;
		expect(div.nodeName).to.equal("div");
	});

	it("has a nodeName equal to the construction function when SFC", () => {
		const sfc = <SimpleFunctionalComponent />;
		expect(sfc.nodeName).to.be.instanceOf(Function);
		const constructor = sfc.nodeName as FunctionalComponent<any>;
		expect(constructor.name).to.eq("SimpleFunctionalComponent");
	});

	it("has a nodeName equal to the constructor of a componet", () => {
		const sfc = <SimpleComponent />;
		expect(sfc.nodeName).to.be.instanceOf(Function);
		const constructor = sfc.nodeName as ComponentConstructor<any>;
		expect(constructor.name).to.eq("SimpleComponent");
	});

	it("has children which is an array of string or other vnodes", () => {
		const comp = (
			<SimpleComponent>
				<SimpleComponent>child1</SimpleComponent>
				child2
			</SimpleComponent>
		);
		expect(comp.children).to.be.instanceOf(Array);
		expect(comp.children[0].constructor.name).to.eq("VNode");
		expect(comp.children[1]).to.be.a("string");
	});
});

class TypedChildren extends Component<{children: (num: number) => string}> {
	render() { return null }
}

const typedChild = <TypedChildren>{num => num.toFixed(2)}</TypedChildren>
