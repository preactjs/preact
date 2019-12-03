import { Component as PreactComponent } from '../../src/index';
// import { installReactCompat, isReactCompatInstalled } from './render';

// export class Component extends PreactComponent {
// 	constructor(props, context) {
// 		super(props, context);
//
// 		if (!isReactCompatInstalled) {
// 			installReactCompat();
// 		}
// 	}
// }

export function Component() {
	PreactComponent.apply(this, arguments);

	// if (!isReactCompatInstalled) {
	// 	installReactCompat();
	// }

	// this.setState = PreactComponent.prototype.setState;
	// this.forceUpdate = PreactComponent.prototype.forceUpdate;
	// this.render = PreactComponent.prototype.render;
}

// Component.prototype.setState = PreactComponent.prototype.setState;
// Component.prototype.forceUpdate = PreactComponent.prototype.forceUpdate;
// Component.prototype.render = PreactComponent.prototype.render;

// Component.prototype = Object.create(PreactComponent);
