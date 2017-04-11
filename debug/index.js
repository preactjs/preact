if (process.env.NODE_ENV === 'development') {
	const { options } = require('preact');
	const oldVnodeOption = options.vnode;

	options.vnode = function(vnode) {
		const { nodeName, attributes } = vnode;

		if (nodeName === void 0) {
			throw new Error('Undefined component passed to preact.h()');
		}

		if (
			attributes && attributes.ref !== void 0 &&
			typeof attributes.ref !== 'function'
		) {
			throw new Error(
				`Component's "ref" property should be a function,` +
				` but [${typeof attributes.ref}] passed`
			);
		}

		return oldVnodeOption.call(this, vnode);
	};

	require('preact/devtools');
}