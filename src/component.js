import { hook } from './hooks';
import { extend, isFunction } from './util';
import { createLinkedState } from './linked-state';
import { triggerComponentRender, setComponentProps } from './vdom/component';

/** Base Component class, for he ES6 Class method of creating Components
 *	@public
 *
 *	@example
 *	class MyFoo extends Component {
 *		render(props, state) {
 *			return <div />;
 *		}
 *	}
 */
export default function Component(props, context) {
	/** @private */
	this._dirty = this._disableRendering = false;
	/** @private */
	this._linkedStates = {};
	/** @private */
	this._renderCallbacks = [];
	/** @public */
	this.prevState = this.prevProps = this.prevContext = this.base = null;
	/** @public */
	this.context = context || null;
	/** @type {object} */
	this.props = props || hook(this, 'getDefaultProps') || {};
	/** @type {object} */
	this.state = hook(this, 'getInitialState') || {};
}


extend(Component.prototype, {

	/** Returns a `boolean` value indicating if the component should re-render when receiving the given `props` and `state`.
	 *	@param {object} nextProps
	 *	@param {object} nextState
	 *	@param {object} nextContext
	 *	@returns {Boolean} should the component re-render
	 *	@name shouldComponentUpdate
	 *	@function
	 */
	// shouldComponentUpdate() {
	// 	return true;
	// },


	/** Returns a function that sets a state property when called.
	 *	Calling linkState() repeatedly with the same arguments returns a cached link function.
	 *
	 *	Provides some built-in special cases:
	 *		- Checkboxes and radio buttons link their boolean `checked` value
	 *		- Inputs automatically link their `value` property
	 *		- Event paths fall back to any associated Component if not found on an element
	 *		- If linked value is a function, will invoke it and use the result
	 *
	 *	@param {string} key				The path to set - can be a dot-notated deep key
	 *	@param {string} [eventPath]		If set, attempts to find the new state value at a given dot-notated path within the object passed to the linkedState setter.
	 *	@returns {function} linkStateSetter(e)
	 *
	 *	@example Update a "text" state value when an input changes:
	 *		<input onChange={ this.linkState('text') } />
	 *
	 *	@example Set a deep state value on click
	 *		<button onClick={ this.linkState('touch.coords', 'touches.0') }>Tap</button
	 */
	linkState(key, eventPath) {
		let c = this._linkedStates,
			cacheKey = key + '|' + (eventPath || '');
		return c[cacheKey] || (c[cacheKey] = createLinkedState(this, key, eventPath));
	},


	/** Update component state by copying properties from `state` to `this.state`.
	 *	@param {object} state		A hash of state properties to update with new values
	 */
	setState(state, callback) {
		let s = this.state;
		if (!this.prevState) this.prevState = extend({}, s);
		extend(s, isFunction(state) ? state(s, this.props) : state);
		if (callback) this._renderCallbacks.push(callback);
		triggerComponentRender(this);
	},


	/** @private */
	setProps(props, opts) {
		return setComponentProps(this, props, opts);
	},


	/** Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
	 *	Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
	 *	@param {object} props		Props (eg: JSX attributes) received from parent element/component
	 *	@param {object} state		The component's current state
	 *	@returns VNode
	 */
	render() {
		// return h('div', null, props.children);
		return null;
	}

});
