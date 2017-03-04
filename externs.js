/**
 * @constructor
 * @param {(string|!NodeName)} nodeName
 * @param {Object=} opt_attributes
 * @param {Array<VNode>=} opt_children
 */
function VNode(nodeName, opt_attributes, opt_children) {}

/** @record
 * @return {?}
 */
function NodeName() { }

/** @type {Object} */
NodeName.prototype.defaultProps

/** @type {(string|!NodeName)} */
VNode.prototype.nodeName;

/** @type {Object|undefined} */
VNode.prototype.attributes;

/** @type {Array<VNode>|undefined} */
VNode.prototypechildren;

/** @type{boolean|string} */
VNode.prototype.key;


/** Base Component class, for the ES6 Class method of creating Components
 * @constructor
 * @param {Object} props
 * @param {Object} context
 * @return {undefined}
 */
function Component(props, context){}

/** @type {?} */
Component.prototype.prevState;
/** @type {?} */
Component.prototype.prevProps;
/** @type {?} */
Component.prototype.prevContext;
/** @type {?} */
Component.prototype.base;
/** @type {?} */
Component.prototype.nextBase;
/** @type {?} */
Component.prototype._parentComponent;
/** @type {?} */
Component.prototype._component;
/** @type {?} */
Component.prototype.__ref;
/** @type {?} */
Component.prototype.__key;
/** @type {?} */
Component.prototype._linkedStates;
/** @type {?} */
Component.prototype._renderCallbacks;

/** @type {boolean} */
Component.prototype._dirty;

/** @type {Object} */
Component.prototype.context;

/** @type {Object} */
Component.prototype.props;

/** @type {Object|undefined} */
Component.prototype.state;

/**
 *	@param {Object} nextProps
 *	@param {Object|undefined} nextState
 *	@param {Object} nextContext
 *	@return {boolean} should the component re-render
 */
Component.prototype.shouldComponentUpdate = function(nextProps, nextState, nextContext){};

/**
 *	@param {string} key		The path to set - can be a dot-notated deep key
 *	@param {string} [eventPath]	If set, attempts to find the new state value at a given dot-notated path within the object passed to the linkedState setter.
 *	@return {function(!Event)}
 */
Component.prototype.linkState = function(key, eventPath){};

/**
 * Update component state by copying properties from `state` to `this.state`.
 * @param {Object} state		A hash of state properties to update with new values
 */
Component.prototype.setState = function(state) {};

/** Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
 *	Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
 *	@param {Object} props		Props (eg: JSX attributes) received from parent element/component
 *	@param {Object|undefined} state		The component's current state
 *	@param {Object} context		Context object (if a parent component has provided context)
 *	@return VNode
 */
Component.prototype.render = function(props, state, context){}

/**
 * Immediately perform a synchronous re-render of the component.
 * @private
 */
Component.prototype.forceUpdate = function(){}

/** @typedef {{syncComponentUpdates: (boolean|undefined), vnode: (Function|undefined), afterMount: (Function|undefined), beforeUnmount: (Function|undefined)}}*/
var Options;


/**
 * @param {!{nodeName: !NodeName}} vnode
 * @param {?} context
 * @return {?}
 */
function buildFunctionalComponent(vnode, context) {}

