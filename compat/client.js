const { render, hydrate, unmountComponentAtNode } = require('preact/compat');

async function createRoot(container) {
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

exports.createRoot = createRoot;

exports.hydrateRoot = async function (container, children) {
	await hydrate(children, container);
	return createRoot(container);
};
