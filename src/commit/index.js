import { commitPropUpdates } from './props';
import options from '../options';
import { commitChildren } from './children';

/**
 * @param {import('../internal').VNode} root
 */
export function commitRoot(parentDom, root) {
	let commitQueue = [];
	commit(parentDom, root, commitQueue);
	if (options._commit) options._commit(root, commitQueue);
	commitQueue.some(c => {
		try {
			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some(cb => {
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode);
		}
	});
}

export const commit = (parentDom, vnode, queue) => {
	let dom = vnode._dom;
	if (typeof vnode.type === 'function') {
		let c = vnode._component;

		if (c.isNew && c.componentDidMount) {
			c._renderCallbacks.push(c.componentDidMount);
		} else if (!c.isNew && c.componentDidUpdate) {
			c._renderCallbacks.push(() =>
				c.componentDidUpdate(c.props, c.state, c._snapshot)
			);
		}

		commitChildren(parentDom, vnode, queue);

		queue.push(c);
	} else {
		if (!dom) {
			if (vnode.type == null) {
				return document.createTextNode(vnode.props);
			}

			dom =
				vnode.type === 'svg'
					? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
					: document.createElement(vnode.type);
		}

		commitPropUpdates(dom, vnode._updates, false);
		commitChildren(dom, vnode, queue);
	}

	return dom;
};
