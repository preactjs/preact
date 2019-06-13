import { createElement } from 'preact';
import React from 'react';
import { createStore } from 'redux';
import { connect, Provider } from 'react-redux';

const store = createStore((state = { value: 0 }, action) => {
	switch (action.type) {
		case 'increment':
			return { value: state.value + 1 };
		case 'decrement':
			return { value: state.value - 1 };
		default:
			return state;
	}
});

class Child extends React.Component {
	render() {
		return (
			<div>
				<div>Child #1: {this.props.foo}</div>
				<ConnectedChild2 />
			</div>
		);
	}
}
const ConnectedChild = connect(store => ({ foo: store.value }))(Child);

class Child2 extends React.Component {
	render() {
		return <div>Child #2: {this.props.foo}</div>;
	}
}
const ConnectedChild2 = connect(store => ({ foo: store.value }))(Child2);

export default function Redux() {
	return (
		<div>
			<h1>Counter</h1>
			<Provider store={store}>
				<ConnectedChild />
			</Provider>
			<br />
			<button onClick={() => store.dispatch({ type: 'increment' })}>+</button>
			<button onClick={() => store.dispatch({ type: 'decrement' })}>-</button>
		</div>
	);
}
