let c = 0;

const isValidKey = key => typeof key == 'object' && key !== null;

function defineWeakMapProp(obj, prop, value) {
	Object.defineProperty(obj, prop, {
		value,
		writable: true,
		configurable: true,
		enumerable: false
	});
}

export class WeakestOfMaps {
	constructor() {
		this._id = typeof Symbol === 'function' ? Symbol() : `__weak$${++c}`;
	}

	set(key, value) {
		if (!isValidKey(key)) {
			throw new TypeError('Invalid value used as weak map key');
		}

		defineWeakMapProp(key, this._id, value);
		return this;
	}

	get(key) {
		if (!isValidKey(key)) {
			return undefined;
		}

		return key[this._id];
	}

	has(key) {
		if (!isValidKey(key)) {
			return false;
		}

		return !!key[this._id];
	}

	delete(key) {
		if (!this.has(key)) {
			return false;
		}

		delete key[this._id];
		return true;
	}
}

Object.defineProperty(WeakestOfMaps.prototype, 'length', {
	value: 0,
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * @returns {WeakMap<object, any>}
 */
export function createWeakMap() {
	return typeof WeakMap === 'function' ? new WeakMap() : new WeakestOfMaps();
}
