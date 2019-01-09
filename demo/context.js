import { createElement, Component, createContext, Fragment } from 'ceviche';
const { Provider, Consumer } = createContext();

class ThemeProvider extends Component {
	state = {
		value: this.props.value
	};

	componentDidMount() {
		setTimeout(() => {
			this.setState({
				value: this.props.next
			});
		}, 3000);
	}

	render() {
		console.log(this.state);
		return <Provider value={this.state.value}>
			{this.props.children}
		</Provider>
	}
}

class Child extends Component {
	shouldComponentUpdate() {
		//return false;
	}

	render() {
		return <>
			<p>ok this is cool</p>
			{this.props.children}
		</>
	}
}

export default class extends Component {
  render(props, state) {
    return (
      <ThemeProvider value="blue" next="red">
				<Child>
					<Consumer>
						{data => (
							<div>
								<p>current theme: {data}</p>
								<ThemeProvider value="black" next="white">
									<Consumer>
										{data => <p>current sub theme: {data}</p>}
									</Consumer>
								</ThemeProvider>
							</div>
						)}
					</Consumer>
				</Child>
      </ThemeProvider>
    )
  }
}
