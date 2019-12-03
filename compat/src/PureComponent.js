import { Component } from './Component';
import { shallowDiffers } from './util';

/**
 * Component class with a predefined `shouldComponentUpdate` implementation
 */
// export class PureComponent extends Component {
// 	constructor(props) {
// 		super(props);
// 		// Some third-party libraries check if this property is present
// 		this.isPureReactComponent = true;
// 	}
//
// 	shouldComponentUpdate(props, state) {
// 		return (
// 			shallowDiffers(this.props, props) || shallowDiffers(this.state, state)
// 		);
// 	}
// }

export function PureComponent(props, context) {
	this.props = props;
	this.context = context;

	// Some third-party libraries check if this property is present
	// this.isReactComponent = {};
	// this.isPureReactComponent = true;
}

PureComponent.prototype.isReactComponent = {};
PureComponent.prototype.isPureReactComponent = true;
PureComponent.prototype.setState = Component.prototype.setState;
PureComponent.prototype.forceUpdate = Component.prototype.forceUpdate;
PureComponent.prototype.shouldComponentUpdate = function(props, state) {
	return shallowDiffers(this.props, props) || shallowDiffers(this.state, state);
};
