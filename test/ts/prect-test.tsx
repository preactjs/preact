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
		return <DumberComponent initialInput={initialInput} input={input} />
	}
}

interface DumberComponentProps extends DummyProps, DummyState {

}

function DumberComponent({ input, initialInput }: DumberComponentProps) {
	return <div>Input: {input}, initial: {initialInput}</div>;
}

render(h(DumberComponent, { initialInput: "The input" }), document.getElementById("xxx"));
