import { enqueueRender } from './component';

export let i = 0;

export function createContext(defaultValue) {
	const ctx = {};

	const context = {
		_id: '__cC' + i++,
		_defaultValue: defaultValue,
		Consumer(props, context) {
			return props.children(props.selector ? props.selector(context) : context);
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
						subs.some(c => {
							if (!c[1] || c[1](_props.value) !== c[1](this.props.value)) {
								c[0].context = _props.value;
								enqueueRender(c[0]);
							}
						});
					}
				};

				this.sub = (c, cb) => {
					const entry = [c, cb];
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

	return context;
}
