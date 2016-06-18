/* eslint-disable */

/** Removes var initialization to `void 0`, which Babel adds for TDZ strictness. */
module.exports = function(file, api, options) {
	var jscodeshift = api.jscodeshift;

	var found = 0;

	var code = api.jscodeshift(file.source)
		.find(jscodeshift.VariableDeclaration)
		.forEach(function(decl) {
			decl.value.declarations.forEach(handleDeclaration);
		});

	function handleDeclaration(node) {
		var init = node.init,
			isPointless = false;
		if (init) {
			if (init.type==='UnaryExpression' && init.operator==='void' && init.argument.value==0) {
				isPointless = true;
			}
			if (init.type==='Identifier' && init.name==='undefined') {
				isPointless = true;
			}
		}

		if (isPointless) {
			node.init = null;
			found++;
		}
	}

	return found ? code.toSource({ quote: 'single' }) : null;
};
