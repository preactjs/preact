import { enqueueRender } from './component';
import { FORCE_UPDATE } from './constants';

let nextContextId = 0;

const providers = new Set();

/** @param {import('./internal').Internal} internal */
export const unsubscribeFromContext = (internal) => {
	// if this was a context provider, delete() returns true and we exit:
	if (providers.delete(internal)) return;
	// ... otherwise, unsubscribe from any contexts:
	providers.forEach((p) => {
		p._component._subs.delete(internal);
	});
};

export const createContext = (defaultValue, contextId) => {
	contextId = '__cC' + nextContextId++;

	const context = {
		_id: contextId,
		_defaultValue: defaultValue,
		/** @type {import('./internal').FunctionComponent} */
		Consumer(props, contextValue) {
			// return props.children(
			// 	context[contextId] ? context[contextId].props.value : defaultValue
			// );
			return props.children(contextValue);
		},
		/** @type {import('./internal').FunctionComponent} */
		Provider(props, ctx) {
			// initial setup:
			if (!this._subs) {
				this._subs = new Set();
				ctx = {};
				ctx[contextId] = this;
				this.getChildContext = () => ctx;
				providers.add(this._internal);
			}
			// re-render subscribers in response to value change
			else if (props.value !== this._prev) {
				this._subs.forEach((internal) => {
					internal.flags |= FORCE_UPDATE;
					enqueueRender(internal);
				});
			}
			this._prev = props.value;

			return props.children;
		}
	};

	// Devtools needs access to the context object when it
	// encounters a Provider. This is necessary to support
	// setting `displayName` on the context object instead
	// of on the component itself. See:
	// https://reactjs.org/docs/context.html#contextdisplayname

	return (context.Provider._contextRef = context.Consumer.contextType =
		context);
};
