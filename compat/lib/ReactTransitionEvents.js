var supported, prefix;

if (typeof document!=='undefined' && document.createElement) {
	var d = document.createElement('div');
	for (var i in d.style) {
		var m = i.match(/^(moz|webkit|ms|)(transition|animation)$/i);
		if (m) supported = true;
		if (m && m[1]) prefix = m[1];
	}
}

function each(node, fn, listener, prefix) {
	node[fn]((prefix || '')+'TransitionEnd', listener);
	node[fn]((prefix || '')+'AnimationEnd', listener);
	if (prefix) each(node, fn, listener);
}

module.exports = {
	addEndEventListener(el, listener) {
		if (supported) each(el, 'addEventListener', listener, prefix);
		else setTimeout(listener, 0);
	},
	removeEndEventListener(el, listener) {
		if (supported) each(el, 'removeEventListener', listener, prefix);
	}
};
