import { FORCE_RENDER } from './constants';
import { extend, clone, isFunction } from './util';
import { createLinkedState } from './linked-state';
import { renderComponent } from './vdom/component';
import { enqueueRender } from './render-queue';

/** Base Component class, for the ES6 Class method of creating Components
 *	@constructor
 *	@param {Object} props
 *	@param {Object} context
 *	class MyFoo extends Component {
 *		render(props, state) {
 *			return <div />;
 *		}
 *	}
 */
export function Component(props, context) {
	/** @private */{}
	this._dirty = true;
	// /** @public */
	// this._disableRendering = false;
	// /** @public */
	// this.prevState = this.prevProps = this.prevContext = this.base = this.nextBase = this._parentComponent = this._component = this.__ref = this.__key = this._linkedStates = this._renderCallbacks = null;
	this.context = context;
	/** @type {Object} */
	this.props = props;
	if (!this.state) {
    /** @type {Object} */
    this.state = {};
  }
}

extend(Component.prototype, {
	/** Returns a function that sets a state property when called.
	 *	Calling linkState() repeatedly with the same arguments returns a cached link function.
	 *
	 *	Provides some built-in special cases:
	 *		- Checkboxes and radio buttons link their boolean `checked` value
	 *		- Inputs automatically link their `value` property
	 *		- Event paths fall back to any associated Component if not found on an element
	 *		- If linked value is a function, will invoke it and use the result
	 *
	 *	Update a "text" state value when an input changes:
	 *		<input onChange={ this.linkState('text') } />
	 *
	 *	Set a deep state value on click
	 *		<button onClick={ this.linkState('touch.coords', 'touches.0') }>Tap</button
	 */
	linkState(key, eventPath) {
		let c = this._linkedStates || (this._linkedStates = {});
		return c[key+eventPath] || (c[key+eventPath] = createLinkedState(this, key, eventPath));
	},

	setState(state, callback) {
		let s = this.state;
		if (!this.prevState) this.prevState = clone(s);
		extend(s, isFunction(state) ? state(s, this.props) : state);
		if (callback) (this._renderCallbacks = (this._renderCallbacks || [])).push(callback);
		enqueueRender(this);
	},

	forceUpdate() {
		renderComponent(this, FORCE_RENDER);
	},

	render() {}
});
