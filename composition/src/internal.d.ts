import { Component as PreactComponent } from '../../src/internal';
import { Ref } from '../../src/index';

export { PreactContext } from '../../src/internal';

import { WatchSrc, WatchCallback, ValueHolder } from './index';

type Watcher = {
	/** input src */
	src: WatchSrc;
	/** callback to call whenever src change */
	cb: WatchCallback;
	/** effect onCleanup */
	cl?: () => void;
	/** watch returned value */
	vr?: ValueHolder;
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
	/** record of contexts connected via watch */
	x: Record<string, PreactContext>;
	/** record of contexts provided by this component */
	c?: Record<string, { _component: Component; _value: any }>;
	/** ref to forward to inner component */
	r?: Ref<any>;
}

export interface Component extends PreactComponent<any, any> {
	constructor: { (c: Component): any; __compositions?: boolean };
	__compositions?: ComponentComposition;
}
