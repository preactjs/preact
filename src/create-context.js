export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	const id = '__cC' + i++;

	let context = {
		_id: id,
		_defaultValue: defaultValue
	};

	function Consumer(props, context) {
		return props.children(context);
	}
	Consumer.contextType = context;
	context.Consumer = Consumer;

	let ctx = { [id]: null };

	function initProvider(comp) {
		comp.subs = [];
		comp.getChildContext = () => {
			ctx[id] = comp;
			return ctx;
		};
		comp.sub = (c) => {
			comp.subs.push(c);
			let old = c.componentWillUnmount;
			c.componentWillUnmount = () => {
				comp.subs.splice(comp.subs.indexOf(c), 1);
				old && old();
			};
		};
	}

	function Provider(props) {
		if (!this.getChildContext) initProvider(this);
		return props.children;
	}
	Provider._id = '_P';
	context.Provider = Provider;

	return context;
}
