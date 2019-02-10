import { enqueueRender } from './component';

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

	function initProvider (comp) {
		let subs = [];
		comp.getChildContext = () => {
			ctx[id] = comp;
			return ctx;
		};
		comp.componentDidUpdate = () => {
			let v = comp.props.value;
			subs.map(c => v !== c.context && (c.context = v, enqueueRender(c)));
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
