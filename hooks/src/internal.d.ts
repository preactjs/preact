import { Component as PreactComponent } from '../../src/internal';

/**
 * The type of arguments passed to a Hook function. While this type is not
 * strictly necessary, they are given a type name to make it easier to read
 * the following types and trace the flow of data.
 */
type HookArgs = any;

/**
 * The return type of a Hook function. While this type is not
 * strictly necessary, they are given a type name to make it easier to read
 * the following types and trace the flow of data.
 */
type HookReturnValue = any;

/** The public function a user invokes to use a Hook */
type Hook = (...args: HookArgs[]) => HookReturnValue;

// Hook tracking

interface ComponentHooks {
	/** The list of hooks a component uses */
	_list: State[];
	/** List of Effects to be invoked after the next frame is rendered */
	_pendingEffects: EffectHookState[];
	/** List of Effects to be invoked at the end of the current render */
	_pendingLayoutEffects: EffectHookState[];
}

interface Component extends PreactComponent<any, any> {
	__hooks: ComponentHooks;
}

type State = EffectHookState;

type Effect = () => (void | Cleanup);
type Cleanup = () => void;

interface EffectHookState {
	_value?: Effect;
	_args?: any[];
	_cleanup?: Cleanup;
}

interface MemoHookState {
	_value?: any;
	_args?: any[];
	_callback?: () => any;
}

interface ReducerHookState {
	_value?: any;
	_component?: Component;
}
