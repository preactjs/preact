export default function logger() {
	let calls = {};
	let lock = true;

	function serialize(obj) {
		if (obj instanceof Text) return '#text';
		if (obj instanceof Element) return `<${obj.localName}>`;
		if (obj===document) return 'document';
		return Object.prototype.toString.call(obj).replace(/(^\[object |\]$)/g, '');
	}

	function count(key) {
		if (lock===true) return;
		calls[key] = (calls[key] || 0) + 1;
	}

	function logCall(obj, method, name) {
		let old = obj[method];
		obj[method] = function() {
			let c = '';
			for (let i=0; i<arguments.length; i++) {
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
	let d = Object.getOwnPropertyDescriptor(CharacterData.prototype, 'data') || Object.getOwnPropertyDescriptor(Node.prototype, 'data');
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
		lock = true;
		root = document.createElement('table');
		root.style.cssText = 'position: fixed; right: 0; top: 0; z-index:999; background: #000; font-size: 12px; color: #FFF; opacity: 0.9; white-space: nowrap; pointer-events: none;';
		let header = document.createElement('thead');
		header.innerHTML = '<tr><td colspan="2">Stats</td></tr>';
		root.tableBody = document.createElement('tbody');
		root.appendChild(root.tableBody);
		root.appendChild(header);
		document.body.appendChild(root);
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
		return rows[id] = row;
	}

	function insertInto(parent) {
		parent.appendChild(root);
	}

	function remove() {
		clearInterval(updateTimer);
	}

	function update() {
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
	return { insertInto, update, remove };
}
