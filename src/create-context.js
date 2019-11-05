import { enqueueRender } from './component';

export let i = 0;

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
					//至于为什么不直接返回content而是用ctx对象来包含
                    //是由于一个Context消费者必须要匹配跟他像关联的Provider
                    //见diff/index.js中diff->outer-> let provider = tmp && context[tmp._id];
					return ctx;
				};
				this.shouldComponentUpdate = _props => {
					//当value不相等时
					if (props.value !== _props.value) {
                        //执行渲染 context消费的组件
                        subs.some(c => {
							c.context = _props.value;
							enqueueRender(c);
						});
					}
				};
				//添加的更新列表中，当value改变时执行
				this.sub = c => {
					subs.push(c);
					let old = c.componentWillUnmount;
					//当组件卸载后从列表中删除，然后执行老的componentWillUnmount
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
