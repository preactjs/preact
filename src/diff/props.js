const diffProp = (vnode, name, newValue, oldValue) => {
	if (name === 'key' || name === 'children') {
	} else if (name[0] === 'o' && name[1] === 'n') {
		vnode._updates.push({ name, value: newValue, oldValue });
	} else if (name === 'dangerouslySetInnerHTML') {
		if (newValue || oldValue) {
			if (!newValue || !oldValue || newValue.__html != oldValue.__html) {
				vnode._updates.push({
					name,
					value: (newValue && newValue.__html) || '',
					oldValue: null
				});
			}
		}
	} else if (typeof newValue !== 'function') {
		vnode._updates.push({
			name,
			value: name !== 'style' && newValue == null ? undefined : newValue,
			oldValue
		});
	}
};

export function diffProps(vnode, newProps, oldProps, isSvg, hydrate) {
	let i;

	for (i in oldProps) {
		if (!(i in newProps)) {
			diffProp(vnode, i, null, oldProps[i]);
		}
	}

	for (i in newProps) {
		if (
			(!hydrate || typeof newProps[i] == 'function') &&
			i !== 'value' &&
			i !== 'checked' &&
			oldProps[i] !== newProps[i]
		) {
			diffProp(vnode, i, newProps[i], oldProps[i]);
		}
	}
}
