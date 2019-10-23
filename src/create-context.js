import { enqueueRender } from './component';

export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
//defaultValue 只有上层没有Provider组件才使用这个，不是Provider没有设置value
export function createContext(defaultValue) {
	const ctx = {};

	const context = {
		_id: '__cC' + i++,
		_defaultValue: defaultValue,
		//context消费者
		Consumer(props, context) {
			//吧context传给children执行
			return props.children(context);
		},
		//context提供者
		Provider(props) {
			if (!this.getChildContext) {
				const subs = [];
				//渲染Provider时调用这个然后吧ctx作为context传递给下级组件
				this.getChildContext = () => {
					ctx[context._id] = this;
					return ctx;
				};
				this.shouldComponentUpdate = _props => {
					//当value不相等时
					if (props.value !== _props.value) {
						//设置
						ctx[context._id].props.value = _props.value;
						subs.some(c => {
							// Check if still mounted
							if (c._parentDom) {
								c.context = _props.value;
								enqueueRender(c);
							}
						});
					}
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
