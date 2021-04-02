import { Fragment } from '../create-element';
import options from '../options';
import { assign } from '../util';
import { Component } from '../component';
import { mountChildren } from './mount';
import { diffChildren, reorderChildren } from './children';
import {
	DIRTY_BIT,
	FORCE_UPDATE,
	MODE_PENDING_ERROR,
	MODE_RERENDERING_ERROR
} from '../constants';
import { addCommitCallback } from './commit';
import { renderReactComponent } from './reactComponents';

export const SKIP = {};

let currentGlobalContext;
export const setCurrentGlobalContext = newGlobalContext =>
	(currentGlobalContext = newGlobalContext);

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactNode} startDom
 * @returns {import('../internal').PreactNode} pointer to the next DOM node (in order) to be rendered (or null)
 */
export function renderComponent(
	parentDom,
	newVNode,
	internal,
	globalContext,
	commitQueue,
	startDom
) {
	if (internal._flags & MODE_PENDING_ERROR) {
		// Toggle the MODE_PENDING_ERROR and MODE_RERENDERING_ERROR flags. In
		// actuality, this should turn off the MODE_PENDING_ERROR flag and turn on
		// the MODE_RERENDERING_ERROR flag.
		internal._flags ^= MODE_PENDING_ERROR | MODE_RERENDERING_ERROR;
	}

	currentGlobalContext = globalContext;

	const renderResult = renderReactComponent(newVNode, internal, globalContext);

	globalContext = currentGlobalContext;

	let nextDomSibling;

	if (renderResult == SKIP) {
		// TODO: Returning undefined here (i.e. return;) passes all tests. That seems
		// like a bug. Should validate that we have test coverage for sCU that
		// returns Fragments with multiple DOM children
		nextDomSibling = reorderChildren(internal, startDom, parentDom);
	} else if (internal._children == null) {
		nextDomSibling = mountChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			internal,
			globalContext,
			commitQueue,
			startDom
		);
	} else {
		nextDomSibling = diffChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			internal,
			globalContext,
			commitQueue,
			startDom
		);
	}

	if (internal._commitCallbacks != null && internal._commitCallbacks.length) {
		commitQueue.push(internal);
	}

	return nextDomSibling;
}
