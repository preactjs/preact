import { Reducer } from '.';

export { PreactContext };

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
}

export interface Component extends globalThis.Component<any, any> {
	__hooks?: ComponentHooks;
	// Extend to include HookStates
	_renderCallbacks?: Array<HookState | (() => void)>;
	_hasScuFromHooks?: boolean;
}

export interface VNode extends globalThis.VNode {
	_mask?: [number, number];
}

export type HookState =
	| EffectHookState
	| MemoHookState
	| ReducerHookState
	| ContextHookState
	| ErrorBoundaryHookState
	| IdHookState;

interface BaseHookState {
	_value?: unknown;
	_component?: undefined;
	_nextValue?: undefined;
	_pendingValue?: undefined;
	_pendingArgs?: undefined;
}

export type Effect = () => void | Cleanup;
export type Cleanup = () => void;

export interface EffectHookState extends BaseHookState {
	_value?: Effect;
	_args?: any[];
	_pendingArgs?: any[];
	_cleanup?: Cleanup | void;
}

export interface MemoHookState extends BaseHookState {
	_value?: any;
	_pendingValue?: any;
	_args?: any[];
	_pendingArgs?: any[];
	_factory?: () => any;
}

export interface ReducerHookState extends BaseHookState {
	_nextValue?: any;
	_value?: any;
	_component?: Component;
	_reducer?: Reducer<any, any>;
}

export interface ContextHookState extends BaseHookState {
	/** Whether this hooks as subscribed to updates yet */
	_value?: boolean;
	_context?: PreactContext;
}

export interface ErrorBoundaryHookState extends BaseHookState {
	_value?: (error: any, errorInfo: ErrorInfo) => void;
}

export interface IdHookState extends BaseHookState {
	_value?: string;
}
