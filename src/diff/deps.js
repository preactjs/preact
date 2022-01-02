import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { assign, removeNode, slice } from '../util';
import {
	diff,
	diffElementNodes,
	unmount,
	applyRef,
	doRender,
	commitRoot
} from './index';
import { diffProps, setProperty } from './props';
import { diffChildren, reorderChildren, placeChild } from './children';
import { createVNode, Fragment, createElement } from '../create-element';
import options from '../options';

/**
 * returns the dependencies used by diff functions
 */
export function diffDeps(Component, getDomSibling, updateParentDomPointers) {
	return {
		EMPTY_OBJ,
		EMPTY_ARR,
		Component,
		getDomSibling,
		updateParentDomPointers,
		Fragment,
		createElement,
		diff: options._generateDiff ? options._generateDiff(diff) : diff,
		diffChildren: options._generateDiffChildren
			? options._generateDiffChildren(diffChildren)
			: diffChildren,
		diffElementNodes: options._generateDiffElementNodes
			? options._generateDiffElementNodes(diffElementNodes)
			: diffElementNodes,
		diffProps,
		setProperty,
		createVNode,
		unmount,
		applyRef,
		assign,
		removeNode,
		slice,
		options,
		reorderChildren,
		placeChild,
		doRender,
		commitRoot,
		yieldNextValue: options._yieldNextValue,
		awaitNextValue: options._awaitNextValue
	};
}
