import { cloneElement, isValidElement, toChildArray } from 'preact';

const mapFn = (children, fn, context) => {
	if (children == null) return null;
	return toChildArray(toChildArray(children).map(fn.bind(context)));
};

/**
 * Flatten `children` like `React.Children.toArray`: every element is cloned
 * with a key scoped to its position in the (nested) input arrays, e.g. `.0`,
 * `.$a` or `.1:$b`. Non-elements are passed through untouched. #2888
 * @param {import('./internal').ComponentChildren} children
 * @param {Array<import('./internal').ComponentChild>} out
 * @param {string} name
 */
const toArray = (children, out, name) => {
	if (Array.isArray(children)) {
		children.forEach((child, i) => {
			toArray(
				child,
				out,
				(name ? name + ':' : '.') +
					(child != null && child.key != null
						? '$' +
							('' + child.key).replace(/[=:]/g, c => (c == '=' ? '=0' : '=2'))
						: i.toString(36))
			);
		});
	} else if (children != null && typeof children != 'boolean') {
		out.push(
			isValidElement(children)
				? cloneElement(children, { key: name })
				: children
		);
	}
	return out;
};

// This API is completely unnecessary for Preact, so it's basically passthrough.
export const Children = {
	map: mapFn,
	forEach: mapFn,
	count(children) {
		return children ? toChildArray(children).length : 0;
	},
	only(children) {
		const normalized = toChildArray(children);
		if (normalized.length != 1) throw 'Children.only';
		return normalized[0];
	},
	toArray: children =>
		toArray(Array.isArray(children) ? children : [children], [], '')
};
