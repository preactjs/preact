'use strict';

if (process.env.NODE_ENV === 'development') {
	(function () {
		var _require = require('preact');

		var options = _require.options;

		var oldVnodeOption = options.vnode;

		options.vnode = function (vnode) {
			var nodeName = vnode.nodeName;
			var attributes = vnode.attributes;
			var children = vnode.children;

			if (nodeName === void 0) {
				throw new Error('Undefined component passed to preact.h()');
			}

			if (attributes && attributes.ref !== void 0 && typeof attributes.ref !== 'function') {
				throw new Error('Component\'s "ref" property should be a function,' + (' but [' + typeof attributes.ref + '] passed'));
			}

			{
				(function () {
					var keys = {};

					inspectChildren(children, function (deepChild) {
						if (!deepChild) return;

						// In Preact, all keys are stored as object values, i.e. being strings
						var key = deepChild.key + '';

						if (key in keys) {
							/* eslint-disable no-console */
							console.error('Following component has two or more children with the ' + 'same "key" attribute. This may cause glitches and misbehavior ' + 'in rendering process. Component: \n\n' + serializeVNode(vnode) + '\n\n');

							// Return early to not spam the console
							return true;
						}

						keys[key] = true;
					});
				})();
			}

			return oldVnodeOption.call(this, vnode);
		};

		var inspectChildren = function inspectChildren(children, inspect) {
			return children.some(function (child, i) {
				if (Array.isArray(child)) {
					return inspectChildren(child, inspect);
				}

				return inspect(child, i);
			});
		};

		var serializeVNode = function serializeVNode(_ref) {
			var nodeName = _ref.nodeName;
			var attributes = _ref.attributes;

			var name = undefined;
			var props = undefined;

			if (typeof nodeName === 'function') {
				name = nodeName.name || nodeName.displayName;
			} else {
				name = nodeName;
			}

			if (attributes) {
				props = Object.keys(attributes).map(function (attr) {
					return attr + '=' + JSON.stringify(attributes[attr] + '');
				});
			}

			if (!props) {
				return '<' + name + ' />';
			}

			return '<' + name + ' ' + props.join(' ') + ' />';
		};

		require('preact/devtools');
	})();
}

//# sourceMappingURL=debug.js.map