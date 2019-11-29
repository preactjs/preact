import * as preact from '../../src';

export function getParent(vnode: preact.VNode): preact.VNode | null;
export function getComponent(vnode: preact.VNode): preact.Component | null;
export function getDom(vnode: preact.VNode): HTMLElement | Text | null;
export function getChildren(
	vnode: preact.VNode
): Array<preact.VNode | null | undefined>;
export function getComponentVNode(component: preact.Component): preact.VNode;

//
// Option hooks
//
// These are using the public types to avoid conflicts. Downside of that
// is that the return types need to be declared manually here.
type OptionsDiff = (vnode: preact.VNode) => void;
type OptionsCommit = (
	vnode: preact.VNode,
	commitQueue: preact.Component[]
) => void;
type OptionsRoot = (
	vnode: preact.ComponentChild,
	parent: Element | Document | ShadowRoot | DocumentFragment
) => void;

// Getters
export function getOptionsDiff(options: preact.Options): OptionsDiff;
export function getOptionsCommit(options: preact.Options): OptionsCommit;
export function getOptionsRoot(options: preact.Options): OptionsRoot;

// Setters
export function setOptionsDiff(options: preact.Options, fn: OptionsDiff): void;
export function setOptionsCommit(
	options: preact.Options,
	fn: OptionsCommit
): void;
export function setOptionsRoot(options: preact.Options, fn: OptionsRoot): void;
