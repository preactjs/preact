import { options } from 'preact';

let oldUnmount = options.unmount;
options.unmount = (vnode, parentVNode) => {
	if (vnode._component != null) {
		if (vnode._component.componentWillUnmount) {
			try {
				vnode._component.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentVNode);
			}
		}

		vnode._component.base = vnode._component._parentDom = null;
	}

	if (oldUnmount) oldUnmount(vnode);
};
