import { Component, createContext, render, h } from '../src';

class Root extends Component {
	state = {
		arr: [{ a: 1 }, { a: 3 }, { a: 2 }]
	};

	render() {
		return (
			<div
				onClick={() => {
					const arr = this.state.arr;

					arr.sort((a, b) => a.a - b.a);
					this.setState(
						{
							arr
						},
						() => arr
					);
				}}
			>
				{this.state.arr.map(item => {
					return <span>{item.a}</span>;
				})}
			</div>
		);
	}
}

render(<Root />, document.getElementById('app'));
