import { Component, PreactElement, VNode } from "../../src/internal";

export { Component, PreactElement, VNode };

export interface RendererConfigBase {
	/** 1 = DEV, 0 = production */
	bundleType: 1 | 0;
	/** The devtools enable different features for different versions of react */
	version: string;
	/** Informative string, currently unused in the devtools  */
	rendererPackageName: string;
}

export interface DevtoolsUpdater {
	setState(objOrFn: any): void;
	forceUpdate(): void;
	setInState(path: Array<string | number>, value: any): void;
	setInProps(path: Array<string | number>, value: any): void;
	setInContext(): void;
}

export interface DevtoolsWindow extends Window {
	/**
	 * If the devtools extension is installed it will inject this object into
	 * the dom. This hook handles all communications between preact and the
	 * devtools panel.
	 */
	__REACT_DEVTOOLS_GLOBAL_HOOK__?: DevtoolsHook;
}
