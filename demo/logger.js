export default function logger(logStats, logConsole) {
	if (!logStats && !logConsole) {
		return;
	}

	const consoleBuffer = new ConsoleBuffer();

	let calls = {};
	let lock = true;

	function serialize(obj) {
		if (obj instanceof Text) return '#text';
		if (obj instanceof Element) return `<${obj.localName}>`;
		if (obj === document) return 'document';
		return Object.prototype.toString.call(obj).replace(/(^\[object |\]$)/g, '');
	}

	function count(key) {
		if (lock === true) return;
		calls[key] = (calls[key] || 0) + 1;

		if (logConsole) {
			consoleBuffer.log(key);
		}
	}

	function logCall(obj, method, name) {
		let old = obj[method];
		obj[method] = function() {
			let c = '';
			for (let i = 0; i < arguments.length; i++) {
				if (c) c += ', ';
				c += serialize(arguments[i]);
			}
			count(`${serialize(this)}.${method}(${c})`);
			return old.apply(this, arguments);
		};
	}

	logCall(document, 'createElement');
	logCall(document, 'createElementNS');
	logCall(Element.prototype, 'remove');
	logCall(Element.prototype, 'appendChild');
	logCall(Element.prototype, 'removeChild');
	logCall(Element.prototype, 'insertBefore');
	logCall(Element.prototype, 'replaceChild');
	logCall(Element.prototype, 'setAttribute');
	logCall(Element.prototype, 'setAttributeNS');
	logCall(Element.prototype, 'removeAttribute');
	logCall(Element.prototype, 'removeAttributeNS');
	let d =
		Object.getOwnPropertyDescriptor(CharacterData.prototype, 'data') ||
		Object.getOwnPropertyDescriptor(Node.prototype, 'data');
	Object.defineProperty(Text.prototype, 'data', {
		get() {
			let value = d.get.call(this);
			count(`get #text.data`);
			return value;
		},
		set(v) {
			count(`set #text.data`);
			return d.set.call(this, v);
		}
	});

	let root;
	function setup() {
		if (!logStats) return;

		lock = true;
		root = document.createElement('table');
		root.style.cssText =
			'position: fixed; right: 0; top: 0; z-index:999; background: #000; font-size: 12px; color: #FFF; opacity: 0.9; white-space: nowrap;';
		let header = document.createElement('thead');
		header.innerHTML =
			'<tr><td colspan="2">Stats <button id="clear-logs">clear</button></td></tr>';
		root.tableBody = document.createElement('tbody');
		root.appendChild(root.tableBody);
		root.appendChild(header);
		document.documentElement.appendChild(root);
		let btn = document.getElementById('clear-logs');
		btn.addEventListener('click', () => {
			for (let key in calls) {
				calls[key] = 0;
			}
		});
		lock = false;
	}

	let rows = {};
	function createRow(id) {
		let row = document.createElement('tr');
		row.key = document.createElement('td');
		row.key.textContent = id;
		row.appendChild(row.key);
		row.value = document.createElement('td');
		row.value.textContent = ' ';
		row.appendChild(row.value);
		root.tableBody.appendChild(row);
		return (rows[id] = row);
	}

	function insertInto(parent) {
		parent.appendChild(root);
	}

	function remove() {
		clearInterval(updateTimer);
	}

	function update() {
		if (!logStats) return;

		lock = true;
		for (let i in calls) {
			if (calls.hasOwnProperty(i)) {
				let row = rows[i] || createRow(i);
				row.value.firstChild.nodeValue = calls[i];
			}
		}
		lock = false;
	}

	let updateTimer = setInterval(update, 50);

	setup();
	lock = false;
	return { insertInto, update, remove };
}

/**
 * Logging to the console significantly affects performance.
 * Buffer calls to console and replay them at the end of the
 * current stack
 * @extends {Console}
 */
class ConsoleBuffer {
	constructor() {
		/** @type {Array<[string, any[]]>} */
		this.buffer = [];
		this.deferred = null;

		for (let methodName of Object.keys(console)) {
			this[methodName] = this.proxy(methodName);
		}
	}

	proxy(methodName) {
		return (...args) => {
			this.buffer.push([methodName, args]);
			this.deferFlush();
		};
	}

	deferFlush() {
		if (this.deferred == null) {
			this.deferred = Promise.resolve()
				.then(() => this.flush())
				.then(() => (this.deferred = null));
		}
	}

	flush() {
		let method;
		while ((method = this.buffer.shift())) {
			let [name, args] = method;
			console[name](...args);
		}
	}
}
