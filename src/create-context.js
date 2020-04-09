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
				this.getChildContext = function() {
					ctx[context._id] = this;
					return ctx;
				};

				this.shouldComponentUpdate = function (_props) {
					const newValue = this.props.value;
					if (newValue !== _props.value) {
						subs.some(payload => {
							payload[0].context = _props.value;
							if (!payload[1] || payload[1](_props.value, newValue)) {
								enqueueRender(payload[0]);
							}
						});
					}
				};

				this.sub = function() {
					subs.push(arguments);
					let old = c.componentWillUnmount;
					c.componentWillUnmount = () => {
						subs.splice(subs.indexOf(arguments), 1);
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
