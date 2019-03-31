import { Component as PreactComponent } from '../../src/internal';

export { PreactContext } from '../../src/internal';

/**
 * The type of arguments passed to a Hook function. While this type is not
 * strictly necessary, they are given a type name to make it easier to read
 * the following types and trace the flow of data.
 */
export type HookArgs = any;

/**
 * The return type of a Hook function. While this type is not
 * strictly necessary, they are given a type name to make it easier to read
 * the following types and trace the flow of data.
 */
export type HookReturnValue = any;

/** The public function a user invokes to use a Hook */
export type Hook = (...args: HookArgs[]) => HookReturnValue;

// Hook tracking

export interface ComponentHooks {
	/** The list of hooks a component uses */
	_list: HookState[];
	/** List of Effects to be invoked after the next frame is rendered */
	_pendingEffects: EffectHookState[];
	/** List of Effects to be invoked at the end of the current render */
	_pendingLayoutEffects: EffectHookState[];
}

export interface Component extends PreactComponent<any, any> {
	__hooks?: ComponentHooks;
}

export type HookState = EffectHookState | MemoHookState | ReducerHookState;

export type Effect = () => (void | Cleanup);
export type Cleanup = () => void;

export interface EffectHookState {
	_value?: Effect;
	_args?: any[];
	_cleanup?: Cleanup;
}

export interface MemoHookState {
	_value?: any;
	_args?: any[];
	_callback?: () => any;
}

export interface ReducerHookState {
	_value?: any;
	_component?: Component;
}
