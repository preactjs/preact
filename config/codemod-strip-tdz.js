/* eslint-disable */

/** Removes var initialization to `void 0`, which Babel adds for TDZ strictness. */
module.exports = function(file, api, options) {
	var jscodeshift = api.jscodeshift;

	var found = 0;

	// parent node types that we don't want to remove pointless initializations from (because it breaks hoisting)
	var blocked = ['ForStatement', 'WhileStatement', 'IfStatement', 'SwtichStatement'];

	var code = api.jscodeshift(file.source)
		.find(jscodeshift.VariableDeclaration)
		.forEach(handleDeclaration);

	function handleDeclaration(decl) {
		var p = decl,
			remove = true,
			fname;

		while (p = p.parentPath) {
			if (!blocked.indexOf(p.value.type)) {
				remove = false;
				break
			}

			if (p.value.type && p.value.type.match(/Function/)) {
				fname = p.value.id && p.value.id.name || '<anon>';
				break;
			}
		}

		decl.value.declarations.filter(isPointless).forEach(function(node) {
			if (remove===false) {
				console.log('> Skipping removal of undefined init for "'+node.id.name+'": within '+p.value.type);
			}
			else {
				removeNodeInitialization(node, fname);
			}
		});
	}

	function removeNodeInitialization(node, fname) {
		// console.log('Removing undefined init for "'+node.id.name+'" within '+fname+'()');
		node.init = null;
		found++;
	}

	function isPointless(node) {
		var init = node.init;
		if (init) {
			if (init.type==='UnaryExpression' && init.operator==='void' && init.argument.value==0) {
				return true;
			}
			if (init.type==='Identifier' && init.name==='undefined') {
				return true;
			}
		}
		return false;
	}

	return found ? code.toSource({ quote: 'single' }) : null;
};
