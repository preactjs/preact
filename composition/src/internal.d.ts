import { Component as PreactComponent } from "../../src/internal";

export { PreactContext } from "../../src/internal";

import { WatchSrc, WatchCallback, RefHolder } from "./index";

type Watcher = {
	/** input src */
	src: WatchSrc;
	/** callback to call whenever src change */
	cb: WatchCallback;
	/** effect onCleanup */
	cl?: () => void;
	/** watch returned ref */
	vr?: RefHolder;
	/** args resultant from src */
	args?: any[];
};

export interface ComponentComposition {
	/** list of unmount callbacks */
	u: (() => void)[];
	/** list of watchs */
	w: Watcher[];
	/** list of effects */
	e: Watcher[];
	/** record of contexts connected */
	x: Record<string, PreactContext>;
}

export interface Component extends PreactComponent<any, any> {
	__composition?: ComponentComposition;
}
