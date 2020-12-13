import { FLAG_MOUNT } from '../constants';
import { diffProps } from './props';
import { normalizeVNode } from './shared';

export function create(
	parentDom,
	newVNode,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	if (newVNode == null) return;

	console.log('create');
	newVNode._flags |= FLAG_MOUNT;
	const newProps = newVNode.props;
	if (typeof newVNode.type === 'function') {
		let children = newProps.children;
		createChildren(
			parentDom,
			Array.isArray(children) ? children : [children],
			newVNode,
			isSvg,
			excessDomChildren,
			commitQueue,
			isHydrating
		);
	} else if (newVNode.type === null) {
		console.log('    CREATE TEXT', newProps);
		newVNode._dom = document.createTextNode(newProps);
	} else {
		// Tracks entering and exiting SVG namespace when descending through the tree.
		isSvg = newVNode.type === 'svg' || isSvg;

		const dom = isSvg
			? document.createElementNS('http://www.w3.org/2000/svg', newVNode.type)
			: document.createElement(
					newVNode.type,
					// Custom Elements specific options
					newProps.is && { is: newProps.is }
			  );

		diffProps(dom, newProps, null, isSvg, isHydrating);

		newVNode._dom = dom;

		console.log('createNODe', dom);

		if (newProps.dangerouslySetInnerHTML) {
			newVNode._children = [];
		} else {
			let children = normalizeVNode(newVNode.props.children, newVNode);
			createChildren(
				dom,
				Array.isArray(children) ? children : [children],
				newVNode,
				newVNode.type === 'foreignObject' ? false : isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);
		}
	}

	placeChild(parentDom, newVNode);
}

function createChildren(
	parentDom,
	renderResult,
	newParentVNode,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	newParentVNode._children = [];
	if (renderResult._children != null) {
		for (let i = 0; i < renderResult._children.length; i++) {
			const childVNode = (newParentVNode._children[i] = normalizeVNode(
				renderResult[i],
				newParentVNode
			));

			if (childVNode != null) {
				create(
					parentDom,
					childVNode,
					isSvg,
					excessDomChildren,
					commitQueue,
					isHydrating
				);

				placeChild(parentDom, childVNode);
			}
		}
	}
}

/**
 *
 * @param {import('../internal').PreactElement} parentDom
 * @param {import('../internal').VNode} vnode
 */
function placeChild(parentDom, vnode) {
	if (vnode._dom != null && vnode._dom.parentNode !== parentDom) {
		parentDom.appendChild(vnode._dom);
	}
}
