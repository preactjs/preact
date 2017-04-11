'use strict';

if (process.env.NODE_ENV === 'development') {
	(function () {
		var _require = require('preact');

		var options = _require.options;

		var oldVnodeOption = options.vnode;

		options.vnode = function (vnode) {
			var nodeName = vnode.nodeName;
			var attributes = vnode.attributes;

			if (nodeName === void 0) {
				throw new Error('Undefined component passed to preact.h()');
			}

			if (attributes && attributes.ref !== void 0 && typeof attributes.ref !== 'function') {
				throw new Error('Component\'s "ref" property should be a function,' + (' but [' + typeof attributes.ref + '] passed'));
			}

			return oldVnodeOption.call(this, vnode);
		};

		require('preact/devtools');
	})();
}

//# sourceMappingURL=debug.js.map