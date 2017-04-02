import { h, render, Component } from 'preact';

interface DummyProps {
	initialInput: string;
}

interface DummyState {
	input: string;
}

class DummyComponent extends Component<DummyProps, DummyState> {
	constructor(props: DummyProps) {
		super(props);
		this.state = {
			input: `x${this.props}x`
		}
	}

	render({ initialInput }: DummyProps, { input }: DummyState) {
		return <DummerComponent initialInput={initialInput} input={input} />
	}
}

interface DummerComponentProps extends DummyProps, DummyState {

}

function DummerComponent({ input, initialInput }: DummerComponentProps) {
	return <div>Input: {input}, initial: {initialInput}</div>;
}

render(h(DummerComponent, { initialInput: "The input" }), document.getElementById("xxx"));
