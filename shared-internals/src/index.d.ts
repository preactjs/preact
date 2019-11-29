import * as preact from '../../src';

export function getParent(vnode: preact.VNode): preact.VNode | null;
export function getComponent(vnode: preact.VNode): preact.Component | null;
export function getDom(vnode: preact.VNode): HTMLElement | Text | null;
export function getLastDomChild(vnode: preact.VNode): HTMLElement | Text | null;
export function getChildren(
	vnode: preact.VNode
): Array<preact.VNode | null | undefined>;
export function getComponentVNode(component: preact.Component): preact.VNode;
