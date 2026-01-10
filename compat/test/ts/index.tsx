import React from '../../src';

React.render(<div />, document.createElement('div'));
React.render(<div />, document.createDocumentFragment());
React.render(<div />, document.body.shadowRoot!);

React.hydrate(<div />, document.createElement('div'));
React.hydrate(<div />, document.createDocumentFragment());
React.hydrate(<div />, document.body.shadowRoot!);

React.unmountComponentAtNode(document.createElement('div'));
React.unmountComponentAtNode(document.createDocumentFragment());
React.unmountComponentAtNode(document.body.shadowRoot!);

React.createPortal(<div />, document.createElement('div'));
React.createPortal(<div />, document.createDocumentFragment());
React.createPortal(<div />, document.body.shadowRoot!);

const Ctx = React.createContext({ contextValue: '' });
class SimpleComponentWithContextAsProvider extends React.Component {
	componentProp = 'componentProp';
	render() {
		// Render inside div to ensure standard JSX elements still work
		return (
			<Ctx value={{ contextValue: 'value' }}>
				<div>
					{/* Ensure context still works */}
					<Ctx.Consumer>
						{({ contextValue }) => contextValue.toLowerCase()}
					</Ctx.Consumer>
				</div>
			</Ctx>
		);
	}
}

SimpleComponentWithContextAsProvider.defaultProps = { foo: 'default' };

React.render(
	<SimpleComponentWithContextAsProvider />,
	document.createElement('div')
);

// SVG camelCase attributes should be available in preact/compat
// These are React-compatible and converted to kebab-case at runtime
const svgCasingTest = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
		<circle fill="blue" strokeWidth="2" cx="24" cy="24" r="20" />
	</svg>
);

// Standard kebab-case SVG attributes should also work
const svgKebabCaseTest = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
		<circle fill="blue" stroke-width="2" cx="24" cy="24" r="20" />
	</svg>
);

// More camelCase SVG attributes that should work in compat
const fillOpacityTest = <rect fillOpacity="0.5" />;
const stopColorTest = <stop stopColor="red" />;
const fontFamilyTest = <text fontFamily="Arial" />;
const strokeDasharrayTest = <path strokeDasharray="5,5" />;
const textAnchorTest = <text textAnchor="middle" />;
