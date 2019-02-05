export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	const id = '__cC' + i++;

	function initConsumer (comp) {
		let ctx = comp.context[id];
		comp.state = {
			v: ctx ? (comp.componentWillUnmount = ctx.sub(comp), ctx.props.value) : defaultValue
		};
	}

	function Consumer(props) {
		if (!this.state.v) initConsumer(this);
		return props.children(this.state.v);
	}

	let ctx = { [id]: null };

	function initProvider (comp) {
		let subs = [];
		comp.getChildContext = () => {
			ctx[id] = comp;
			return ctx;
		};
		comp.componentDidUpdate = () => {
			let v = comp.props.value;
			subs.map(c => v !== c.state.v && c.setState({ v }));
		};
		comp.sub = (c) => {
			subs.push(c);
			return () => {
				subs.splice(subs.indexOf(c), 1);
			};
		};
	}

	function Provider(props) {
		if (!this.getChildContext) initProvider(this);
		return props.children;
	}

	return {
		_id: id,
		_defaultValue: defaultValue,
		Provider,
		Consumer
	};
}
