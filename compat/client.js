const { render, hydrate } = require('preact/compat');

exports.createRoot = function(container) {
	return {
		render(children) {
			return render(children, container);
		}
	};
};

exports.hydrateRoot = function(container, children) {
	return hydrate(children, container);
};
