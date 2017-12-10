// import { assign } from './util';
import { diff } from './diff/index';

export function Component(props, context) {
	this.props = props;
	this.context = context;
	this.state = {};
	this._dirty = true;
	this._renderCallbacks = [];
}

Component.prototype.setState = function(update, callback) {
	let s = this.nextState || this.state;
	if (typeof update==='function') update = update(s);
	// this.nextState = assign(assign({}, this.state), update);
	this.nextState = Object.assign({}, s, update);
	if (callback!=null) this._renderCallbacks.push(callback);
	enqueueRender(this);
};

Component.prototype.forceUpdate = function(callback) {
	diff(this.base, this.base.parentNode, this.vnode, this.vnode, this.context);
	if (callback != null) callback();
};


let q = [];
// resolved = Promise.resolve();
function enqueueRender(c) {
	// if (!c._dirty && (c._dirty = true) && q.push(c) === 1) resolved.then(process);
	if (!c._dirty && (c._dirty = true) && q.push(c) === 1) requestAnimationFrame(process);
	// if (q.push(c) === 1) setTimeout(process);
}
function process() {
	let p;
	while ((p = q.pop())) {
		if (p._dirty) {
			diff(p.base, p.base.parentNode, p.vnode, p.vnode, p.context);
		}
	}
}