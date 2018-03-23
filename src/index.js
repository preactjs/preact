export { render, hydrate } from './render';
export { createElement, Fragment } from './create-element';
export { Component } from './component';
export { cloneElement } from './clone-element';

/*
function createElement(nodeName, props) {
	let i, c, el = document.createElement(nodeName);
	for (i in props)
		if (i === 'style') {
			Object.assign(el.style, props[i]);
		}
		else {
			el[i] = props[i];
		}
	for (i = 2; i < arguments.length; i++)
		if ((c = arguments[i]) != null)
			el.appendChild('appendChild' in Object(c) ? c : document.createTextNode(c));
	return el;
}


document.body.appendChild(
	<div className="foo">
		<h1>HELLO WORLD</h1>
		<p className="shake">hola there</p>
	</div>
);
*/
