import { enqueueRender } from './component';

export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	let context = {
		_id: '__cC' + i++,
		_defaultValue: defaultValue
	};

	function Consumer(props, context) {
		return props.children(context);
	}
	Consumer.contextType = context;
	context.Consumer = Consumer;

	let ctx = {};

	function initProvider(comp) {
		const subs = [];
		comp.getChildContext = () => {
			ctx[context._id] = comp;
			return ctx;
		};
		comp.shouldComponentUpdate = props => {
			subs.some(c => {
				// Check if still mounted
				if (c._parentDom) {
					c.context = props.value;
					enqueueRender(c);
				}
			});
		};
		comp.sub = (c) => {
			subs.push(c);
			let old = c.componentWillUnmount;
			c.componentWillUnmount = () => {
				subs.splice(subs.indexOf(c), 1);
				old && old();
			};
		};
	}

	function Provider(props) {
		if (!this.getChildContext) initProvider(this);
		return props.children;
	}
	context.Provider = Provider;

	return context;
}
