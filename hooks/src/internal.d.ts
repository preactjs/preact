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
	_list: HookInstance[];
	/** List of Effects to be invoked after the next frame is rendered */
	_pendingEffects: HookInstance[];
	/** List of Effects to be invoked at the end of the current render */
	_pendingLayoutEffects: HookInstance[];
}

interface Component extends PreactComponent<any, any> {
	__hooks: ComponentHooks;
}

// Hook implementation
type Cleanup = () => void;

/** A instance of a hook assigned to a component */
interface HookInstance {
	_index: number;

	/** Previous args Hook was invoked with */
	_args?: HookArgs[];

	/** The implementation of a Hook */
	_run?: Hook;

	/** The value the Hook returns to the user */
	_value?: HookReturnValue;

	_cleanup?(): void;
}

/** A function to determine if a Hook's implementation should be invoked */
type HookShouldRun = (oldArgs: HookArgs[], newArgs: HookArgs[]) => boolean;

/**
 * A function that creates Hook instances. It wraps the Hook implementation and only invokes
 * the implementation if it should run (as determined by the `shouldRun` parameter).
 */
type HookFactory = (create: HookImplementationFactory, shouldRun?: HookShouldRun) => Hook;

/**
 * A function that creates the implementation for a Hook. It is invoked once the first time
 * a hook is called. The returned function is the actual Hook implementation that is invoked
 * on the first and subsequent calls to a Hook.
 */
type HookImplementationFactory = (hookInstance: HookInstance, component: Component, ...initialArgs: HookArgs[]) => Hook;
