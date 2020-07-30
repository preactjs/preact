import { Component } from 'preact';
import { shallowDiffers } from './util';

/**
 * Component class with a predefined `shouldComponentUpdate` implementation
 */
export function PureComponent() {}
const proto = (PureComponent.prototype = new Component());
// proto.constructor = PureComponent;
// Some third-party libraries check if this property is present
proto.isPureReactComponent = true;
proto.shouldComponentUpdate = function(props, state) {
	return shallowDiffers(this.props, props) || shallowDiffers(this.state, state);
};
