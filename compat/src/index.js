import {
	createElement,
	render as preactRender,
	cloneElement as preactCloneElement,
	createRef,
	Component,
	createContext,
	Fragment
} from 'preact';
import {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue
} from 'preact/hooks';
import { PureComponent } from './PureComponent';
import { memo } from './memo';
import { forwardRef } from './forwardRef';
import { Children } from './Children';
import { Suspense, lazy } from './suspense';
import { SuspenseList } from './suspense-list';
import { createPortal } from './portals';
import {
	hydrate,
	render,
	REACT_ELEMENT_TYPE,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
} from './render';
export * from './scheduler';

const version = '16.8.0'; // trick libraries to think we are react

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
			(component.base || (component.nodeType === 1 && component))) ||
		null
	);
}

/**
 * Deprecated way to control batched rendering inside the reconciler, but we
 * already schedule in batches inside our rendering code
 * @template Arg
 * @param {(arg: Arg) => void} callback function that triggers the updated
 * @param {Arg} [arg] Optional argument that can be passed to the callback
 */
// eslint-disable-next-line camelcase
const unstable_batchedUpdates = (callback, arg) => callback(arg);

/**
 * Strict Mode is not implemented in Preact, so we provide a stand-in for it
 * that just renders its children without imposing any restrictions.
 */
const StrictMode = Fragment;

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
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	// eslint-disable-next-line camelcase
	unstable_batchedUpdates,
	StrictMode,
	Suspense,
	SuspenseList,
	lazy,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};

// React copies the named exports to the default one.
export default {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
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
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	unstable_batchedUpdates,
	StrictMode,
	Suspense,
	SuspenseList,
	lazy,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};
