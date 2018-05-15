import "mocha";
import { expect } from "chai";
import {
	h,
	Component,
	FunctionalComponent,
	ComponentConstructor,
	RenderableProps,
	render
} from "../../src/preact";

export class ContextComponent extends Component<{ foo: string }> {
	getChildContext() {
		return { something: 2 };
	}

	render() {
		return null;
	}
}

export interface SimpleComponentProps {
	initialName: string | null;
}

export interface SimpleState {
	name: string | null;
}

export class SimpleComponent extends Component<
	SimpleComponentProps,
	SimpleState
> {
	constructor(props: SimpleComponentProps) {
		super(props);
		this.state = {
			name: props.initialName
		};
	}

	render() {
		if (!this.state.name) {
			return null;
		}
		const { initialName, children } = this.props;
		return (
			<div>
				<span>
					{initialName} / {this.state.name}
				</span>
				{children}
			</div>
		);
	}
}

class DestructuringRenderPropsComponent extends Component<
	SimpleComponentProps,
	SimpleState
> {
	constructor(props: SimpleComponentProps) {
		super(props);
		this.state = {
			name: props.initialName
		};
	}

	render({ initialName, children }: RenderableProps<SimpleComponentProps>) {
		if (!this.state.name) {
			return null;
		}
		return (
			<span>
				{this.props.initialName} / {this.state.name}
			</span>
		);
	}
}

interface RandomChildrenComponenProps {
	num?: number;
	val?: string;
	span?: boolean;
}

class RandomChildrenComponen extends Component<RandomChildrenComponenProps> {
	render() {
		const { num, val, span } = this.props;
		if (num) {
			return num;
		}
		if (val) {
			return val;
		}
		if (span) {
			return <span>hi</span>
		}
		return null;
	}
}

describe("Component", () => {
	const component = new SimpleComponent({ initialName: "da name" });

	it("has state", () => {
		expect(component.state.name).to.eq("da name");
	});

	it("has props", () => {
		expect(component.props.initialName).to.eq("da name");
	});

	it("has no base when not mounted", () => {
		expect(component).to.not.haveOwnProperty("base");
	});

	describe("setState", () => {
		it("can be used with an object", () => {
			component.setState({ name: "another name" });
		});

		it("can be used with a function", () => {
			const updater = (state: any, props: any) => ({
				name: `${state.name} - ${props.initialName}`
			});
			component.setState(updater);
		});
	});

	describe("render", () => {
		it("can return null", () => {
			const comp = new SimpleComponent({ initialName: null });
			const actual = comp.render();

			expect(actual).to.eq(null);
		});
	});
});
