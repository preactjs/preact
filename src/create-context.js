import { enqueueRender } from './component';

export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	const ctx = {};

	const context = {
		_id: '__cC' + i++,
		_defaultValue: defaultValue,
		Consumer(props, context) {
			this.shouldComponentUpdate = function (_props, _state, _context) {
				return _context !== context;
			};
			return props.children(context);
		},
		Provider(props) {
			if (!this.getChildContext) {
				const subs = [];
				this.getChildContext = () => {
					ctx[context._id] = this;
					return ctx;
				};
				this.shouldComponentUpdate = props => {
					subs.some(c => {
						// Check if still mounted
						if (c._parentDom) {
							c.context = props.value;
							enqueueRender(c);
						}
					});
				};
				this.sub = (c) => {
					subs.push(c);
					let old = c.componentWillUnmount;
					c.componentWillUnmount = () => {
						subs.splice(subs.indexOf(c), 1);
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
