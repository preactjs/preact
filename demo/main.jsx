import { createContext, h, render } from '../src';

const FontContext = createContext(20);

function Child() {
	return (
		<FontContext.Consumer>
			{fontSize => <div style={{ fontSize: fontSize }}>child</div>}
		</FontContext.Consumer>
	);
}
function App() {
	return <Child />;
}
render(
	<FontContext.Provider value={26}>
		<App />
	</FontContext.Provider>,
	document.getElementById('app')
);
