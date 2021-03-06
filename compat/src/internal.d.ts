import {
	Component as PreactComponent,
	VNode as PreactVNode,
	FunctionComponent as PreactFunctionComponent,
	Internal as PreactInternal
} from '../../src/internal';
import { SuspenseProps } from './suspense';

export { ComponentChildren } from '../..';

export { PreactElement } from '../../src/internal';

export interface Internal<P = {}> extends PreactInternal<P> {
	// Override some of Internal's properties with compat types (namely _component)
	_parent: Internal;
	_children: Internal[];
	_component: Component;
}

export interface Component<P = {}, S = {}> extends PreactComponent<P, S> {
	_internal?: Internal<P> | null;

	isReactComponent?: object;
	isPureReactComponent?: true;
	_patchedLifecycles?: true;

	// Suspense internal properties
	_childDidSuspend?(error: Promise<void>, suspendingVNode: VNode): void;
	_suspended: (vnode: VNode) => (unsuspend: () => void) => void;
	_onResolve?(): void;
	_parentDom?: PreactElement;
	_originalParentDom?: PreactElement;

	// Portal internal properties
	_temp: any;
	_container: PreactElement;
}

export interface FunctionComponent<P = {}> extends PreactFunctionComponent<P> {
	shouldComponentUpdate?(nextProps: Readonly<P>): boolean;
	_forwarded?: boolean;
	_patchedLifecycles?: true;
}

export interface VNode<T = any> extends PreactVNode<T> {
	$$typeof?: symbol | string;
	preactCompatNormalized?: boolean;
}

export interface SuspenseState {
	_suspended?: null | Internal<any>;
}

export interface SuspenseComponent
	extends Component<SuspenseProps, SuspenseState> {
	_pendingSuspensionCount: number;
	_suspenders: Component[];
	_detachOnNextRender: null | Internal<any>;
}
