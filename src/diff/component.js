import { mountChildren } from './mount';
import { diffChildren, reorderChildren } from './children';
import {
	COMMIT_COMPONENT,
	DIRTY_BIT,
	MODE_PENDING_ERROR,
	MODE_RERENDERING_ERROR,
	SKIP_CHILDREN
} from '../constants';
import { renderReactComponent } from './reactComponents';

/** @type {import('../internal').RendererState} */
// TODO: Now that context is the only thing in rendererState, do we really need it?
export const rendererState = { context: {} };

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactNode} startDom
 * @returns {import('../internal').PreactNode} pointer to the next DOM node (in order) to be rendered (or null)
 */
export function renderComponent(
	parentDom,
	newVNode,
	internal,
	commitQueue,
	startDom
) {
	internal.flags &= ~DIRTY_BIT;
	if (internal.flags & MODE_PENDING_ERROR) {
		// Toggle the MODE_PENDING_ERROR and MODE_RERENDERING_ERROR flags. In
		// actuality, this should turn off the MODE_PENDING_ERROR flag and turn on
		// the MODE_RERENDERING_ERROR flag.
		internal.flags ^= MODE_PENDING_ERROR | MODE_RERENDERING_ERROR;
	}

	let prevContext = rendererState.context;

	const renderResult = renderReactComponent(newVNode, internal, rendererState);

	internal.props = newVNode.props;
	if (prevContext != rendererState.context) {
		internal._context = rendererState.context;
	}

	let nextDomSibling;
	if (internal.flags & SKIP_CHILDREN) {
		// TODO: Returning undefined here (i.e. return;) passes all tests. That seems
		// like a bug. Should validate that we have test coverage for sCU that
		// returns Fragments with multiple DOM children
		nextDomSibling = reorderChildren(internal, startDom, parentDom);
	} else if (internal._children == null) {
		nextDomSibling = mountChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			internal,
			commitQueue,
			startDom
		);
	} else {
		nextDomSibling = diffChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			internal,
			commitQueue,
			startDom
		);
	}

	if (internal.flags & COMMIT_COMPONENT) {
		commitQueue.push(internal);
	}

	// In the event this subtree creates a new context for its children, restore
	// the previous context for its siblings
	rendererState.context = prevContext;

	return nextDomSibling;
}
