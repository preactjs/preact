import { createElement, Component, createContext } from '../../';

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

// preact.JSX.HTMLAttributes also appears to work here but for consistency,
// let's use createElement.JSX
interface WhateveElAttributes extends createElement.JSX.HTMLAttributes {
	someattribute?: string;
	onsomeevent?: (this: WhateverElement, ev: WhateverElementEvent) => void;
}

// Ensure context still works
const { Provider, Consumer } = createContext({ contextValue: '' });

// Sample component that uses custom elements

class SimpleComponent extends Component {
	componentProp = 'componentProp';
	render() {
		// Render inside div to ensure standard JSX elements still work
		return (
			<Provider value={{ contextValue: 'value' }}>
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
					<Consumer>
						{({ contextValue }) => contextValue.toLowerCase()}
					</Consumer>
				</div>
			</Provider>
		);
	}
}

const component = <SimpleComponent />;
