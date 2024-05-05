const { render, hydrate, unmountComponentAtNode } = require('preact/compat');

function createRoot(container) {
	return {
		render: function (children) {
			render(children, container);
		},
		unmount: function () {
			unmountComponentAtNode(container);
		}
	};
}

exports.createRoot = createRoot;

exports.hydrateRoot = function (container, children) {
	hydrate(children, container);
	return createRoot(container);
};
