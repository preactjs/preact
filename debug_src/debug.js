const preact = require('../');

const original = {
	h: preact.h
};

const config = {
	undefinedComponents: true,
	stringRefs: true,
	arrayChildren: true
};

preact.h = function(nodeName, attributes) {
	if (config.undefinedComponents && nodeName === void 0) {
		throw new Error('Undefined component passed to preact.h()');
	}

	if (
		config.stringRefs && attributes &&
		attributes.ref !== void 0 && typeof attributes.ref !== 'function'
	) {
		throw new Error(
			`Component's "ref" property should be a function,` +
			` but [${typeof attributes.ref}] passed`
		);
	}

	if (config.arrayChildren) {
		[].slice.call(arguments, 2).forEach(child => {
			if (Array.isArray(child)) {
				const hasKeys = child.every(child => !!child.key);

				if (!hasKeys) {
					/* eslint-disable no-console */
					console.warn(
						'An array is passed to a component. ' +
						'Consider specifying "key" property to prevent unnecessary ' +
						'component recreations. Component: \n\n' +
						serializeVNode(nodeName, attributes) + '\n\n'
					);
				}
			}
		});
	}

	return original.h.apply(this, arguments);
};

module.exports.setConfig = function setConfig(params) {
	Object.keys(config).forEach(key => {
		if (key in params) {
			config[key] = params[key];
		}
	});
};

function serializeVNode(nodeName, attributes) {
	let name;
	let props;

	if (typeof nodeName === 'function') {
		name = nodeName.name || nodeName.displayName;
	} else {
		name = nodeName;
	}

	if (attributes) {
		props = Object.keys(attributes).map(attr => {
			return `${attr}=${JSON.stringify(attributes[attr] + '')}`;
		});
	}

	if (!props) {
		return `<${name} />`;
	}

	return `<${name} ${props.join(' ')} />`;
}