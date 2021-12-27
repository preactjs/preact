import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { assign, removeNode, slice } from '../util';
import { diff, diffElementNodes, unmount, applyRef, doRender } from './index';
import { diffProps, setProperty } from './props';
import { diffChildren, reorderChildren, placeChild } from './children';
import { diffAsync, diffChildrenAsync, diffElementNodesAsync } from './async';
import { Component, getDomSibling } from '../component';
import { createVNode, Fragment } from '../create-element';
import options from '../options';

/**
 * returns the dependencies used by diff functions
 */
export function diffDeps() {
	return {
		EMPTY_OBJ,
		EMPTY_ARR,
		Component,
		getDomSibling,
		Fragment,
		diff: options.asyncRendering ? diffAsync : diff,
		diffChildren: options.asyncRendering ? diffChildrenAsync : diffChildren,
		diffElementNodes: options.asyncRendering ? diffElementNodesAsync : diffElementNodes,
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
		doRender
	};
}
