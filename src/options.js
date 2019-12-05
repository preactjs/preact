import { _catchError } from './diff/catch-error';

//保存各种钩子，例如设置options.vnode在创建虚拟节点时会执行
/** @type {import('./internal').Options}  */
const options = {
	_catchError
};

export default options;
