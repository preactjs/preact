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
const contextValue: { contextValue: string } = React.use(Ctx);
const promiseValue: string = React.use(Promise.resolve('value'));

contextValue.contextValue.toLowerCase();
promiseValue.toLowerCase();

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

// Children.map / Children.forEach accept an optional context argument
const mappedChildren: string[] = React.Children.map([<div />], () => 'child');
const readonlyChildren: readonly React.ReactElement[] = [<div />];
const mappedReadonly: string[] = React.Children.map(readonlyChildren, child =>
	String(child.type)
);
React.Children.forEach([<div />], () => {});
React.Children.forEach(readonlyChildren, child => {
	child.type;
});
React.Children.map([<div />], () => 'child', {});
React.Children.forEach([<div />], () => {}, {});
mappedChildren.length;
mappedReadonly.length;

// findDOMNode accepts null and undefined like in React
React.findDOMNode(null);
React.findDOMNode(undefined);


// React-style attribute interfaces can be spread onto their element
export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} />;
}
export function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
	return <a {...props} />;
}
export function Picture(props: React.ImgHTMLAttributes<HTMLImageElement>) {
	return <img {...props} />;
}
export function Field(props: React.ComponentPropsWithoutRef<'input'>) {
	return <input {...props} />;
}

// isValidElement and isElement narrow to an element like in React
const maybeElement: React.ReactNode = <div title="x" />;
if (React.isValidElement(maybeElement)) {
	maybeElement.props;
}
if (React.isElement(maybeElement)) {
	maybeElement.props;
}
