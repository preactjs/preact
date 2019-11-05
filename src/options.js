import { _catchError } from './diff/catch-error';

//设置对象
//以便增加各种钩子，例如设置options.vnode在创建虚拟节点时会执行
/** @type {import('./internal').Options}  */
const options = {
	_catchError
};

export default options;
