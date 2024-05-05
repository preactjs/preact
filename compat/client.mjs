import { render, hydrate, unmountComponentAtNode } from 'preact/compat';

export function createRoot(container) {
	return {
		render: function (children) {
			render(children, container);
		},
		unmount: function () {
			unmountComponentAtNode(container);
		}
	};
}

export function hydrateRoot(container, children) {
	hydrate(children, container);
	return createRoot(container);
}

export default {
	createRoot,
	hydrateRoot
};
