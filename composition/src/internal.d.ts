import { Component as PreactComponent } from "../../src/internal";

export { PreactContext } from "../../src/internal";

import { WatchSrc, WatchCallback, RefHolder } from "./index";

type Watcher = {
	src: WatchSrc;
	cb: WatchCallback;
	vr?: RefHolder;
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
