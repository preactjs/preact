import { VNode } from 'preact';

interface Options {
	jsx?: boolean;
	xml?: boolean;
	pretty?: boolean | string;
	shallow?: boolean;
	functions?: boolean;
	functionNames?: boolean;
	skipFalseAttributes?: boolean;
}

export default function renderToStringPretty(
	vnode: VNode,
	context?: any,
	options?: Options
): string;

export function shallowRender(vnode: VNode, context?: any): string;

export default render;
