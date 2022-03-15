import { VNode } from 'preact';

export interface Options {
	shallow?: boolean;
	xml?: boolean;
	pretty?: boolean | string;
}

type RenderFn = (vnode: VNode, context?: any, options?: Options) => string;
export const render: RenderFn;
export const renderToString: RenderFn;
export const renderToStaticMarkup: RenderFn;

export function shallowRender(vnode: VNode, context?: any): string;

export interface JsxOptions extends Options {
	functions?: boolean;
	functionNames?: boolean;
	skipFalseAttributes?: boolean;
}

export function renderToJsxString(
	vnode: VNode,
	context?: any,
	options: JsxOptions
): string;
