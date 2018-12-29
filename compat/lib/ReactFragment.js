var preact = require('preact-compat');

exports.create = function(obj) {
	var children = [];
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			var child = [].concat(obj[key]);
			for (var i=0; i<child.length; i++) {
				var c = child[i];
				// if unkeyed, clone attrs and inject key
				if (preact.isValidElement(c) && !(c.attributes && c.attributes.key)) {
					var a = {};
					if (c.attributes) for (var j in c.attributes) a[j] = c.attributes[j];
					a.key = key+'.'+i;
					c = preact.createElement(c.nodeName, a, c.children);
				}
				if (c!=null) children.push(c);
			}
		}
	}
	return children;
};
