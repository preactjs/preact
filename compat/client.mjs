import { render, hydrate, unmountComponentAtNode } from 'preact/compat';

export async function createRoot(container) {
	return {
		// eslint-disable-next-line
		render: async function (children) {
			await render(children, container);
		},
		// eslint-disable-next-line
		unmount: function () {
			unmountComponentAtNode(container);
		}
	};
}

export async function hydrateRoot(container, children) {
	await hydrate(children, container);
	return createRoot(container);
}

export default {
	createRoot,
	hydrateRoot
};
