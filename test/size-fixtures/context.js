import { render, createElement, createContext } from '../../';

/* @jsx createElement */

const Context = createContext(null);

render(
	<Context.Provider value="Hello World">
		<div>
			<Context.Consumer>{value => <span>{value}</span>}</Context.Consumer>
		</div>
	</Context.Provider>,
	document.getElementById('root')
);
