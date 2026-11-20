import { enqueueRender } from './component';
import { COMPONENT_FORCE } from './constants';

export let i = 0;

export function createContext(defaultValue) {
	function Context(props) {
		if (!this.getChildContext) {
			/** @type {Map<import('./internal').Component, number>} */
			let subs = new Map();
			let ctx = {};
			ctx[Context._id] = this;

			this.getChildContext = () => ctx;

			this.shouldComponentUpdate = function (_props) {
				// @ts-expect-error even
				if (this.props.value != _props.value) {
					subs.forEach((_, c) => {
						c._bits |= COMPONENT_FORCE;
						enqueueRender(c);
					});
				}
			};

			// A hook can leave while another hook or an implicit consumer still uses it.
			this.sub = c => {
				subs.set(c, (subs.get(c) || 0) + 1);
				let cleanups = c._contextSubs;
				if (!cleanups) {
					cleanups = c._contextSubs = new Set();
					let old = c.componentWillUnmount;
					c.componentWillUnmount = () => {
						cleanups.forEach(cleanup => cleanup());
						if (old) old.call(c);
					};
				}
				const unsubscribe = () => {
					if (cleanups.delete(unsubscribe)) {
						const count = subs.get(c) - 1;
						if (count) subs.set(c, count);
						else subs.delete(c);
					}
				};
				cleanups.add(unsubscribe);
				return unsubscribe;
			};
		}

		return props.children;
	}

	Context._id = '__cC' + i++;
	Context._defaultValue = defaultValue;

	/** @type {import('./internal').FunctionComponent} */
	Context.Consumer = (props, contextValue) => {
		return props.children(contextValue);
	};

	Context.Provider = Context.Consumer.contextType = Context;

	return Context;
}
