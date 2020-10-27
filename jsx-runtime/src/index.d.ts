export { Fragment } from '../../';
import {
	ComponentType,
	ComponentChild,
	ComponentChildren,
	VNode,
	Attributes
} from '../../';
import { JSXInternal } from '../../src/jsx';

export function jsx(
	type: string,
	props: JSXInternal.HTMLAttributes &
		JSXInternal.SVGAttributes &
		Record<string, any> & { children?: ComponentChild },
	key?: string
): VNode<any>;
export function jsx<P>(
	type: ComponentType<P>,
	props: Attributes & P & { children?: ComponentChild },
	key?: string
): VNode<any>;
export namespace jsx {
	export import JSX = JSXInternal;
}

export function jsxs(
	type: string,
	props: JSXInternal.HTMLAttributes &
		JSXInternal.SVGAttributes &
		Record<string, any> & { children?: ComponentChild[] },
	key?: string
): VNode<any>;
export function jsxs<P>(
	type: ComponentType<P>,
	props: Attributes & P & { children?: ComponentChild[] },
	key?: string
): VNode<any>;
export namespace jsxs {
	export import JSX = JSXInternal;
}

export function jsxDEV(
	type: string,
	props: JSXInternal.HTMLAttributes &
		JSXInternal.SVGAttributes &
		Record<string, any> & { children?: ComponentChildren },
	key?: string
): VNode<any>;
export function jsxDEV<P>(
	type: ComponentType<P>,
	props: Attributes & P & { children?: ComponentChildren },
	key?: string
): VNode<any>;
export namespace jsxDEV {
	export import JSX = JSXInternal;
}
