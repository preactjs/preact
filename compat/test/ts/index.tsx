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
