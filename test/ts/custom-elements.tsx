import { createElement, Component, createContext, HTMLAttributes, MouseEventHandler } from '../../';

declare module '../../' {
	namespace createElement.JSX {
		interface IntrinsicElements {
			// Custom element can use JSX EventHandler definitions
			'clickable-ce': {
				optionalAttr?: string;
				onClick?: MouseEventHandler<HTMLElement>;
			};

			// Custom Element that extends HTML attributes
			'color-picker': HTMLAttributes & {
				// Required attribute
				space: 'rgb' | 'hsl' | 'hsv';
				// Optional attribute
				alpha?: boolean;
			};

			// Custom Element with custom interface definition
			'custom-whatever': WhateveElAttributes;
		}
	}
}

// Whatever Element definition

interface WhateverElement {
	instanceProp: string;
}

interface WhateverElementEvent {
	eventProp: number;
}

interface WhateveElAttributes extends HTMLAttributes {
	someattribute?: string;
	onsomeevent?: (this: WhateverElement, ev: WhateverElementEvent) => void;
}

// Ensure context still works
const Ctx = createContext({ contextValue: '' });

// Sample component that uses custom elements

class SimpleComponent extends Component {
	componentProp = 'componentProp';
	render() {
		// Render inside div to ensure standard JSX elements still work
		return (
			<Ctx.Provider value={{ contextValue: 'value' }}>
				<div>
					<clickable-ce
						onClick={e => {
							// `this` should be instance of SimpleComponent since this is an
							// arrow function
							console.log(this.componentProp);

							// Validate `currentTarget` is HTMLElement
							console.log('clicked ', e.currentTarget.style.display);
						}}
					></clickable-ce>
					<color-picker space="rgb" dir="rtl"></color-picker>
					<custom-whatever
						dir="auto" // Inherited prop from HTMLAttributes
						someattribute="string"
						onsomeevent={function (e) {
							// Validate `this` and `e` are the right type
							console.log('clicked', this.instanceProp, e.eventProp);
						}}
					></custom-whatever>

					{/* Ensure context still works */}
					<Ctx.Consumer>
						{({ contextValue }) => contextValue.toLowerCase()}
					</Ctx.Consumer>
				</div>
			</Ctx.Provider>
		);
	}
}

const component = <SimpleComponent />;
class SimpleComponentWithContextAsProvider extends Component {
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
const component2 = <SimpleComponentWithContextAsProvider />;
