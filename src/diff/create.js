import { diffProps } from './props';
import { normalizeVNode } from './shared';

export function create(
	parentDom,
	newVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	const newProps = newVNode.props;
	if (typeof newVNode.type === 'function') {
	} else if (newVNode.type === null) {
		newVNode._dom = document.createTextNode(newProps);
	} else {
		const dom = isSvg
			? document.createElementNS('http://www.w3.org/2000/svg', newVNode.type)
			: document.createElement(
					newVNode.type,
					newProps.is && { is: newProps.is }
			  );

		diffProps(dom, newProps, null, isSvg, isHydrating);

		if (newProps.dangerouslySetInnerHTML) {
			newVNode._children = [];
		} else {
			let i = newVNode.props.children;
			createChildren(
				dom,
				Array.isArray(i) ? i : [i],
				newVNode,
				globalContext,
				newVNode.type === 'foreignObject' ? false : isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);
		}
	}
}

function createChildren(
	parentDom,
	renderResult,
	newParentVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	newParentVNode._children = [];
	for (let i = 0; i < renderResult._children.length; i++) {
		const childVNode = (newParentVNode._children[i] = normalizeVNode(
			renderResult[i],
			newParentVNode
		));

		if (childVNode == null) {
			continue;
		}

		create(
			parentDom,
			childVNode,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			isHydrating
		);
	}
}
