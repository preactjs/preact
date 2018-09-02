import "mocha";
import { expect } from "chai";
import {
	createElement,
	Component,
	FunctionalComponent,
	ComponentConstructor
} from "../../src";

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
		expect(actual).to.include.all.keys(
			"tag", "props", "text", "key"
		);
	});

	it("has a nodeName of string when html element", () => {
		const div = <div>Hi!</div>;
		expect(div.tag).to.equal("div");
	});

	it("has a nodeName equal to the construction function when SFC", () => {
		const sfc = <SimpleFunctionalComponent />;
		expect(sfc.tag).to.be.instanceOf(Function);
		const constructor = sfc.tag as FunctionalComponent<any>;
		expect(constructor.name).to.eq("SimpleFunctionalComponent");
	});

	it("has a nodeName equal to the constructor of a componet", () => {
		const sfc = <SimpleComponent />;
		expect(sfc.tag).to.be.instanceOf(Function);
		const constructor = sfc.tag as ComponentConstructor<any>;
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
