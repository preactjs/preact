import { diff } from './diff/index';
import { createElement } from './create-element'

export function Component(props, context) {
	this.props = props;
	this.context = context;
	this.state = {};
	this._renderCallbacks = [];
}

Component.prototype.setState = function(update, callback) {
	if (typeof update==='function') update = update(this.state);
	this.nextState = Object.assign({}, this.state, update);
	if (callback!=null) this._renderCallbacks.push(callback);
	enqueueRender(this);
};

Component.prototype.forceUpdate = function(callback) {
	diff(this.base, this.base.parentNode, createElement(this.constructor, this.props), createElement(this.constructor, this.props), this.context);
	if (callback != null) callback();
};


let q = [],
	resolved = Promise.resolve();
function enqueueRender(c) {
	if (q.push(c)===1) resolved.then(process);
}
function process() {
	let p;
	while ((p = q.pop())) {
		diff(p.base, p.base.parentNode, createElement(p.constructor, p.props), createElement(p.constructor, p.props), p.context);
	}
}