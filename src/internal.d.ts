export interface PreactElement extends Element {
	_previousVTree?: VNode<any>

	ownerSVGElement?: SVGElement;
	style: HTMLElement["style"];
}

export interface VNode<P> extends preact.VNode<P> {
	_children?: Array<VNode> | null;
	_el?: PreactElement | null;
	_component?: Component | null;
}

export interface Component<P, S> extends preact.Component<P, S> {
	_dirty: boolean;
	_renderCallbacks: Array<() => void>;
	_vnode?: VNode<P> | null;
	_nextState?: S | null;
	_previousVTree?: VNode;
	_ancestorComponent?: Component<any, any>;
	_processingException?: Component<any, any>;
}
