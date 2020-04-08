import { enqueueRender } from './component';

export let i = 0;

export function createContext(defaultValue) {
	const ctx = {};

	const context = {
		_id: '__cC' + i++,
		_defaultValue: defaultValue,
		Consumer(props, context) {
			return props.children(context);
		},
		Provider(props) {
			if (!this.getChildContext) {
				const subs = [];
				this.getChildContext = () => {
					ctx[context._id] = this;
					return ctx;
				};

				this.shouldComponentUpdate = _props => {
					if (this.props.value !== _props.value) {
						subs.some(payload => {
							payload.c.context = _props.value;
							if (!payload.u || payload.u(_props.value, this.props.value)) {
								enqueueRender(payload.c);
							}
						});
					}
				};

				this.sub = (c, shouldUpdate) => {
					const entry = { c, u: shouldUpdate };
					subs.push(entry);
					let old = c.componentWillUnmount;
					c.componentWillUnmount = () => {
						subs.splice(subs.indexOf(entry), 1);
						old && old.call(c);
					};
				};
			}

			return props.children;
		}
	};

	context.Consumer.contextType = context;

	// Devtools needs access to the context object when it
	// encounters a Provider. This is necessary to support
	// setting `displayName` on the context object instead
	// of on the component itself. See:
	// https://reactjs.org/docs/context.html#contextdisplayname
	context.Provider._contextRef = context;

	return context;
}
