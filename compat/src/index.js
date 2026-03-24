import {
	Component,
	Fragment,
	createContext,
	createElement,
	createRef,
	options,
	cloneElement as preactCloneElement,
	render as preactRender
} from 'preact';
import {
	useCallback,
	useContext,
	useDebugValue,
	useEffect,
	useId,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState
} from 'preact/hooks';
import { Children } from './Children';
import { PureComponent } from './PureComponent';
import { forwardRef } from './forwardRef';
import {
	startTransition,
	useDeferredValue,
	useInsertionEffect,
	useSyncExternalStore,
	useTransition
} from './hooks';
import { memo } from './memo';
import { createPortal } from './portals';
import {
	REACT_ELEMENT_TYPE,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
	hydrate,
	render
} from './render';
import { Suspense, lazy } from './suspense';

const version = '18.3.1'; // trick libraries to think we are react

/**
 * Legacy version of createElement.
 * @param {import('./internal').VNode["type"]} type The node name or Component constructor
 */
function createFactory(type) {
	return createElement.bind(null, type);
}

/**
 * Check if the passed element is a valid (p)react node.
 * @param {*} element The element to check
 * @returns {boolean}
 */
function isValidElement(element) {
	return !!element && element.$$typeof === REACT_ELEMENT_TYPE;
}

/**
 * Check if the passed element is a Fragment node.
 * @param {*} element The element to check
 * @returns {boolean}
 */
function isFragment(element) {
	return isValidElement(element) && element.type === Fragment;
}

/**
 * Check if the passed element is a Memo node.
 * @param {*} element The element to check
 * @returns {boolean}
 */
function isMemo(element) {
	return (
		!!element &&
		typeof element.displayName == 'string' &&
		element.displayName.indexOf('Memo(') == 0
	);
}

/**
 * Wrap `cloneElement` to abort if the passed element is not a valid element and apply
 * all vnode normalizations.
 * @param {import('./internal').VNode} element The vnode to clone
 * @param {object} props Props to add when cloning
 * @param {Array<import('./internal').ComponentChildren>} rest Optional component children
 */
function cloneElement(element) {
	if (!isValidElement(element)) return element;
	return preactCloneElement.apply(null, arguments);
}

/**
 * Remove a component tree from the DOM, including state and event handlers.
 * @param {import('./internal').PreactElement} container
 * @returns {boolean}
 */
function unmountComponentAtNode(container) {
	if (container._children) {
		preactRender(null, container);
		return true;
	}
	return false;
}

/**
 * Get the matching DOM node for a component
 * @param {import('./internal').Component} component
 * @returns {import('./internal').PreactElement | null}
 */
function findDOMNode(component) {
	return (
		(component &&
			((component._vnode && component._vnode._dom) ||
				(component.nodeType === 1 && component))) ||
		null
	);
}

/**
 * In React, `flushSync` flushes the entire tree and forces a rerender.
 * @template Arg
 * @template Result
 * @param {(arg: Arg) => Result} callback function that runs before the flush
 * @param {Arg} [arg] Optional argument that can be passed to the callback
 * @returns
 */
const flushSync = (callback, arg) => {
	const prevDebounce = options.debounceRendering;
	options.debounceRendering = cb => cb();
	const res = callback(arg);
	options.debounceRendering = prevDebounce;
	return res;
};

/**
 * In React, `unstable_batchedUpdates` is a legacy feature that was made a no-op
 * outside of legacy mode in React 18 and a no-op across the board in React 19.
 * @template Arg
 * @template Result
 * @param {(arg: Arg) => Result} callback
 * @param {Arg} [arg]
 * @returns {Result}
 */
function unstable_batchedUpdates(callback, arg) {
	return callback(arg);
}

// compat to react-is
export const isElement = isValidElement;

export * from 'preact/hooks';
export {
	version,
	Children,
	render,
	hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	isFragment,
	isMemo,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	flushSync,
	unstable_batchedUpdates,
	useInsertionEffect,
	startTransition,
	useDeferredValue,
	useSyncExternalStore,
	useTransition,
	Fragment as StrictMode,
	Suspense,
	lazy,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};

// React copies the named exports to the default one.
export default {
	useState,
	useId,
	useReducer,
	useEffect,
	useLayoutEffect,
	useInsertionEffect,
	useTransition,
	useDeferredValue,
	useSyncExternalStore,
	startTransition,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue,
	version,
	Children,
	render,
	hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	isElement,
	isFragment,
	isMemo,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	flushSync,
	unstable_batchedUpdates,
	StrictMode: Fragment,
	Suspense,
	lazy,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};
