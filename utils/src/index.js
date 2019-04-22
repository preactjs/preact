import { render, h, Component } from 'preact';
import { assign } from '../../src/util';

class ContextProvider {
	getChildContext() {
		return this.props.context;
	}
	render(props) {
		return props.children;
	}
}

/**
 * Portal component
 * @param {object | null | undefined} props
 */
function Portal(props) {
	let wrap = h(ContextProvider, { context: this.context }, props.vnode);
	render(wrap, props.container);
	this.componentWillUnmount = () => {
		render(null, props.container);
	};
	return null;
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('../../compat/src/internal').VNode} vnode The vnode to render
 * @param {import('../../compat/src/internal').PreactElement} container The DOM node to continue rendering in to.
 */
export function createPortal(vnode, container) {
	return h(Portal, { vnode, container });
}

/**
 * Check if two objects have a different shape
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function shallowDiffers(a, b) {
	for (let i in a) if (!(i in b)) return true;
	for (let i in b) if (a[i]!==b[i]) return true;
	return false;
}

/**
 * Component class with a predefined `shouldComponentUpdate` implementation
 */
export class PureComponent extends Component {
	constructor(props) {
		super(props);
		// Some third-party libraries check if this property is present
		this.isPureReactComponent = true;
	}

	shouldComponentUpdate(props, state) {
		return shallowDiffers(this.props, props) || shallowDiffers(this.state, state);
	}
}

/**
 * Memoize a component, so that it only updates when the props actually have
 * changed. This was previously known as `React.pure`.
 * @param {import('../../compat/src/internal').FunctionalComponent} c functional component
 * @param {(prev: object, next: object) => boolean} [comparer] Custom equality function
 * @returns {import('../../compat/src/internal').FunctionalComponent}
 */
export function memo(c, comparer) {
	function shouldUpdate(nextProps) {
		let ref = this.props.ref;
		let updateRef = ref==nextProps.ref;
		if (!updateRef) {
			ref.call ? ref(null) : (ref.current = null);
		}
		return (comparer==null
			? shallowDiffers(this.props, nextProps)
			: !comparer(this.props, nextProps)) || !updateRef;
	}

	function Memoed(props) {
		this.shouldComponentUpdate = shouldUpdate;
		return h(c, assign({}, props));
	}
	Memoed.displayName = 'Memo(' + (c.displayName || c.name) + ')';
	Memoed._forwarded = true;
	return Memoed;
}
