/* istanbul ignore file */
import { options, ATTR_KEY } from 'preact';
import { now, catchErrors } from './util';
import { createAdapter } from './connect';
import { SESSION_STORAGE_RELOAD_AND_PROFILE_KEY } from './constants';

let noop = () => null;

export function initDevTools() {

	/** @type {import('../internal').DevtoolsWindow} */
	let win = /** @type {*} */ (window);

	// This global variable is injected by the devtools
	let hook = win.__REACT_DEVTOOLS_GLOBAL_HOOK__;

	if (hook==null || hook.isDisabled) return;

	catchErrors(() => {
		let isDev = false;
		try {
			isDev = process.env.NODE_ENV!=='production';
		}
		catch (e) {}

		// Tell devtools which bundle type we run in
		window.parent.postMessage({
			source: 'react-devtools-detector',
			reactBuildType: /* istanbul ignore next */  isDev
				? 'development'
				: 'production'
		}, '*');

		/** @type {import('../internal').RendererConfigBase} */
		let config = {
			bundleType: /* istanbul ignore next */  isDev ? 1 : 0,
			version: '16.8.4',
			rendererPackageName: 'preact'
		};

		const adapter = createAdapter(config, /** @type {*} */ (hook));

		// Necessary for "reload-and-profile" feature
		if (window.sessionStorage.getItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY)==='true') {
			adapter.renderer.startProfiling();
		}

		onCommitRoot = root => adapter.onCommitRoot(root);
		onCommitUnmount = vnode => adapter.onCommitUnmount(vnode);

		adapter.connect();
	})();

	// Store (possible) previous hooks so that we don't overwrite them
	let prevVNodeHook = options.vnode;
	let prevCommitRoot = options._commit;
	let prevBeforeUnmount = options.unmount;
	let prevBeforeDiff = options._diff;
	let prevAfterDiff = options.diffed;

	options.vnode = (vnode) => {
		// Tiny performance improvement by initializing fields as doubles
		// from the start. `performance.now()` will always return a double.
		// See https://github.com/facebook/react/issues/14365
		// and https://slidr.io/bmeurer/javascript-engine-fundamentals-the-good-the-bad-and-the-ugly
		vnode.startTime = NaN;
		vnode.endTime = NaN;

		vnode.startTime = 0;
		vnode.endTime = -1;
		if (prevVNodeHook) prevVNodeHook(vnode);
	};

	options.diffed = (vnode, oldVNode) => {
		vnode.endTime = now();
		let c;
		if (vnode!=null && (c = vnode._component)!=null) {
			c._prevProps = oldVNode!=null ? oldVNode.props : null;
			c._prevContext = oldVNode!=null && oldVNode._component!=null ? oldVNode._component._context : null;

			if (c.__hooks!=null) {
				c._prevHooksRevision = c._currentHooksRevision;
				c._currentHooksRevision = c.__hooks._list.reduce((acc, x) => acc + x._revision, 0);
			}
		}
		if (prevAfterDiff!=null) prevAfterDiff(vnode);
	};


	// Teardown devtools options. Mainly used for testing
	return () => {
		options.unmount = prevBeforeUnmount;
		options._commit = prevCommitRoot;
		options.diffed = prevAfterDiff;
		options._diff = prevBeforeDiff;
		options.vnode = prevVNodeHook;
	};
}


/** Notify devtools that a component has been unmounted from the DOM. */
const componentRemoved = component => {
	const instance = updateReactComponent(component);
	visitNonCompositeChildren(childInst => {
		instanceMap.delete(childInst.node);
		Reconciler.unmountComponent(childInst);
	});
	Reconciler.unmountComponent(instance);
	instanceMap.delete(component);
	if (instance._rootID) {
		delete roots[instance._rootID];
	}
};


/**
 * Return `true` if a preact component is a top level component rendered by
 * `render()` into a container Element.
 */
function isRootComponent(component) {
	// `_parentComponent` is actually `__u` after minification
	if (component._parentComponent || component.__u) {
		// Component with a composite parent
		return false;
	}
	if (component.base.parentElement && component.base.parentElement[ATTR_KEY]) {
		// Component with a parent DOM element rendered by Preact
		return false;
	}
	return true;
}

/**
 * Visit all child instances of a ReactCompositeComponent-like object that are
 * not composite components (ie. they represent DOM elements or text)
 *
 * @param {Component} component
 * @param {(Component) => void} visitor
 */
function visitNonCompositeChildren(component, visitor) {
	if (!component) return;
	if (component._renderedComponent) {
		if (!component._renderedComponent._component) {
			visitor(component._renderedComponent);
			visitNonCompositeChildren(component._renderedComponent, visitor);
		}
	} else if (component._renderedChildren) {
		component._renderedChildren.forEach(child => {
			visitor(child);
			if (!child._component) visitNonCompositeChildren(child, visitor);
		});
	}
}

// /**
//  * Create a bridge between the preact component tree and React's dev tools
//  * and register it.
//  *
//  * After this function is called, the React Dev Tools should be able to detect
//  * "React" on the page and show the component tree.
//  *
//  * This function hooks into preact VNode creation in order to expose functional
//  * components correctly, so it should be called before the root component(s)
//  * are rendered.
//  *
//  * Returns a cleanup function which unregisters the hooks.
//  */
// export function initDevTools() {
// 	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
// 		// React DevTools are not installed
// 		return;
// 	}

// 	// Notify devtools when preact components are mounted, updated or unmounted
// 	const bridge = createDevToolsBridge();

// 	const nextAfterMount = options.afterMount;
// 	options.afterMount = component => {
// 		bridge.componentAdded(component);
// 		if (nextAfterMount) nextAfterMount(component);
// 	};

// 	const nextAfterUpdate = options.afterUpdate;
// 	options.afterUpdate = component => {
// 		bridge.componentUpdated(component);
// 		if (nextAfterUpdate) nextAfterUpdate(component);
// 	};

// 	const nextBeforeUnmount = options.beforeUnmount;
// 	options.beforeUnmount = component => {
// 		bridge.componentRemoved(component);
// 		if (nextBeforeUnmount) nextBeforeUnmount(component);
// 	};
