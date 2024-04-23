const { render, hydrate, unmountComponentAtNode } = require('preact/compat');

function createRoot(container) {
	return {
		render(children) {
			render(children, container);
		},
		unmount() {
			unmountComponentAtNode(container);
		}
	};
}

exports.createRoot = createRoot;

exports.hydrateRoot = function (container, children) {
	hydrate(children, container);
	return createRoot(container);
};
