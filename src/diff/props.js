import { IS_NON_DIMENSIONAL } from '../constants';
import options from '../options';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 * @param {boolean} hydrate Whether or not we are in hydration mode
 */
//对比props
export function diffProps(dom, newProps, oldProps, isSvg, hydrate) {
	let i;
	//如果属性名在oldProps不在newProps 则执行setProperty
	for (i in oldProps) {
		if (!(i in newProps)) {
			setProperty(dom, i, null, oldProps[i], isSvg);
		}
	}
	//如果 非hydrate或者属性名为函数 并且属性名不为value，checked 并且新的属性值不等于老的属性值 则执行setProperty
	for (i in newProps) {
		if ((!hydrate || typeof newProps[i]=='function') && i!=='value' && i!=='checked' && oldProps[i]!==newProps[i]) {
			setProperty(dom, i, newProps[i], oldProps[i], isSvg);
		}
	}
}

//设置样式
function setStyle(style, key, value) {
	//如果第一个字符为-直接调用setProperty设置，例如key为-webkit-border-radius
	if (key[0] === '-') {
		style.setProperty(key, value);
	}
	else {
		//value为数字并且key是尺寸类型则值自动加px
		//value为null则设置为空字符串
		style[key] = typeof value==='number' && IS_NON_DIMENSIONAL.test(key)===false ? value+'px' : value==null ? '' : value;
	}
}

/**
 * Set a property value on a DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to modify
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node or not
 */
//dom设置属性
function setProperty(dom, name, value, oldValue, isSvg) {
	//修复svg时 属性名为className转为class 非svg时属性名为class转className
	name = isSvg ? (name==='className' ? 'class' : name) : (name==='class' ? 'className' : name);
	//如果属性名为key 或者 children
	if (name==='key' || name === 'children') {}
	//如果为style
	else if (name==='style') {
		const s = dom.style;
		//value为字符串直接使用cssText设置
		if (typeof value==='string') {
			s.cssText = value;
		}
		else {
			//老值为字符串时cssText设为空
			if (typeof oldValue==='string') {
				s.cssText = '';
				//标记防止再执行下面将老值中的属性设为空
				oldValue = null;
			}
			//如果 oldValue 并且 oldValue中的属性已经不在newValue中则设置空
			if (oldValue) for (let i in oldValue) {
				if (!(value && i in value)) {
					setStyle(s, i, '');
				}
			}
			//如果 value 并且 (没有老值 或 新值中属性值和老值中的属性值不相同)  则调用setStyle设置样式
			if (value) for (let i in value) {
				if (!oldValue || value[i] !== oldValue[i]) {
					setStyle(s, i, value[i]);
				}
			}
		}

	}
	// Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
	//如果属性名前面为on  则为事件
	else if (name[0]==='o' && name[1]==='n') {
		//是否捕获模式
		let useCapture = name !== (name=name.replace(/Capture$/, ''));
		//转小写
		let nameLower = name.toLowerCase();
		//小写在dom中用小写不然用name   然后去掉on字符串
		name = (nameLower in dom ? nameLower : name).slice(2);

		if (value) {
			//只有老值为非才添加，因为事件函数是固定的eventProxy，实际的事件在listeners储存
			if (!oldValue) dom.addEventListener(name, eventProxy, useCapture);
			//内部储存
			(dom._listeners || (dom._listeners = {}))[name] = value;
		}
		else {
			//移除事件
			dom.removeEventListener(name, eventProxy, useCapture);
		}
	}
	//属性名不为list tabName form 并且非svg 属性名在dom中    直接用dom设置
	else if (
		name!=='list'
		&& name!=='tagName'
		// HTMLButtonElement.form and HTMLInputElement.form are read-only but can be set using
		// setAttribute
		&& name!=='form'
		&& !isSvg
		&& (name in dom)
	) {
		dom[name] = value==null ? '' : value;
	}
	//如果属性值不为函数并且属性名不为dangerouslySetInnerHTML
	else if (typeof value!=='function' && name!=='dangerouslySetInnerHTML') {
		//属性名中有xlink通过setAttributeNS removeAttributeNS设置
		if (name!==(name = name.replace(/^xlink:?/, ''))) {
			if (value==null || value===false) {
				dom.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase());
			}
			else {
				dom.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value);
			}
		}
		//值为null或这false则移除属性
		else if (value==null || value===false) {
			dom.removeAttribute(name);
		}
		//设置属性
		else {
			dom.setAttribute(name, value);
		}
	}
}

/**
 * Proxy an event to hooked event handlers
 * @param {Event} e The event object from the browser
 * @private
 */
//在事件执行时添加钩子
function eventProxy(e) {
	//如果存在options.event则先执行钩子
	return this._listeners[e.type](options.event ? options.event(e) : e);
}
