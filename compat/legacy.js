/* eslint-disable */
var PropTypes = dep(require('prop-types'));
var compat = dep(require('../dist/compat'));
var server = dep(require('./server'));

function dep(obj) { return obj['default'] || obj; }

for (var i in compat) module.exports[i] = compat[i];
for (var i in server) module.exports[i] = server[i];

const ELEMENTS = 'a abbr address area article aside audio b base bdi bdo big blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd keygen label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td textarea tfoot th thead time title tr track u ul var video wbr circle clipPath defs ellipse g image line linearGradient mask path pattern polygon polyline radialGradient rect stop svg text tspan'.split(' ');

let DOM = {};
for (let i=ELEMENTS.length; i--; ) {
	DOM[ELEMENTS[i]] = createFactory(ELEMENTS[i]);
}

function createFactory(type) {
	return createElement.bind(null, type);
}

module.exports.PropTypes = PropTypes;
module.exports.DOM = DOM;
module.exports.createFactory = createFactory;
