// eslint-disable-next-line no-unused-vars
import { createElement, Component, createContext, Fragment } from "preact";
const { Provider, Consumer } = createContext();

class ThemeProvider extends Component {
	state = {
		value: this.props.value
	};

	onClick = () => {
		this.setState(prev => ({
			value: prev.value===this.props.value ? this.props.next : this.props.value
		}));
	}

	render() {
		return (
			<div>
				<button onClick={this.onClick}>Toggle</button>
				<Provider value={this.state.value}>{this.props.children}</Provider>
			</div>
		);
	}
}

class Child extends Component {
	shouldComponentUpdate() {
		return false;
	}

	render() {
		return (
			<>
				<p>(blocked update)</p>
				{this.props.children}
			</>
		);
	}
}

class OldContext extends Component {
	getChildContext() {
		return { foo: 123 };
	}

	render() {
		return <OldContextChild />;
	}
}

class OldContextChild extends Component {
	render() {
		return <div>context value: {this.context.foo}</div>;
	}
}

export default class ContextDemo extends Component {
	render() {
		return (
			<div>
				<h2>New Context</h2>
				<ThemeProvider value="blue" next="red">
					<Child>
						<Consumer>
							{data => (
								<div>
									<p>current theme: <b>{data}</b></p>
									<ThemeProvider value="black" next="white">
										<Consumer>
											{data => <p>current sub theme: <b>{data}</b></p>}
										</Consumer>
									</ThemeProvider>
								</div>
							)}
						</Consumer>
					</Child>
				</ThemeProvider>
				<h2>Old Context</h2>
				<OldContext />
			</div>
		);
	}
}
