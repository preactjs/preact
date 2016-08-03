import renderToString from '.';
import { indent, encodeEntities, assign } from './util';
import prettyFormat from 'pretty-format';


// we have to patch in Array support, Possible issue in npm.im/pretty-format
let preactPlugin = {
	test(object) {
		return object && typeof object==='object' && 'nodeName' in object && 'attributes' in object && 'children' in object && !('nodeType' in object);
	},
	print(val, print, indent) {
		return renderToString(val, preactPlugin.context, preactPlugin.opts, true);
	}
};


let prettyFormatOpts = {
	plugins: [preactPlugin]
};


function attributeHook(name, value, context, opts) {
	let indentChar = typeof opts.pretty==='string' ? opts.pretty : '\t';
	if (typeof value!=='string') {
		preactPlugin.context = context;
		preactPlugin.opts = opts;
		value = prettyFormat(value, prettyFormatOpts);
		if (~value.indexOf('\n')) {
			value = `${indent('\n'+value, indentChar)}\n`;
		}
		return indent(`\n${name}={${value}}`, indentChar);
	}
	return `\n${indentChar}${name}="${encodeEntities(value)}"`;
}


let defaultOpts = {
	attributeHook,
	jsx: true,
	xml: true,
	pretty: '  '
};


export default function renderToJsxString(vnode, context, opts, inner) {
	opts = assign(assign({}, defaultOpts), opts || {});
	return renderToString(vnode, context, opts, inner);
}
