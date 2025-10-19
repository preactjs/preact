/**
 * Validation utilities for Preact
 * These functions help validate component props and common patterns
 */

import { NULL } from './constants';

/**
 * Validate that a value is not null or undefined
 * @param {*} value The value to validate
 * @param {string} name The name of the value for error messages
 * @throws {Error} If value is null or undefined
 */
export function validateRequired(value, name) {
	if (value == NULL) {
		throw new Error(`${name} is required but was ${value}`);
	}
}

/**
 * Validate that a value is a function
 * @param {*} value The value to validate
 * @param {string} name The name of the value for error messages
 * @throws {Error} If value is not a function
 */
export function validateFunction(value, name) {
	if (typeof value !== 'function') {
		throw new Error(
			`${name} must be a function, got ${typeof value}`
		);
	}
}

/**
 * Validate that a value is an object
 * @param {*} value The value to validate
 * @param {string} name The name of the value for error messages
 * @throws {Error} If value is not an object
 */
export function validateObject(value, name) {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error(
			`${name} must be an object, got ${typeof value}`
		);
	}
}

/**
 * Validate that a value is a string
 * @param {*} value The value to validate
 * @param {string} name The name of the value for error messages
 * @throws {Error} If value is not a string
 */
export function validateString(value, name) {
	if (typeof value !== 'string') {
		throw new Error(
			`${name} must be a string, got ${typeof value}`
		);
	}
}

/**
 * Validate that a value is a number
 * @param {*} value The value to validate
 * @param {string} name The name of the value for error messages
 * @throws {Error} If value is not a number
 */
export function validateNumber(value, name) {
	if (typeof value !== 'number' || isNaN(value)) {
		throw new Error(
			`${name} must be a valid number, got ${typeof value}`
		);
	}
}

/**
 * Validate that a value is an array
 * @param {*} value The value to validate
 * @param {string} name The name of the value for error messages
 * @throws {Error} If value is not an array
 */
export function validateArray(value, name) {
	if (!Array.isArray(value)) {
		throw new Error(
			`${name} must be an array, got ${typeof value}`
		);
	}
}

/**
 * Validate that a value is one of the allowed values
 * @param {*} value The value to validate
 * @param {Array} allowedValues Array of allowed values
 * @param {string} name The name of the value for error messages
 * @throws {Error} If value is not in allowedValues
 */
export function validateOneOf(value, allowedValues, name) {
	if (!allowedValues.includes(value)) {
		throw new Error(
			`${name} must be one of [${allowedValues.join(', ')}], got ${value}`
		);
	}
}

/**
 * Create a prop type validator for component props
 * This is a lightweight alternative to PropTypes
 * @param {object} propTypes Object mapping prop names to validator functions
 * @returns {Function} A function that validates props
 * @example
 * const validateProps = createPropValidator({
 *   name: (val) => validateString(val, 'name'),
 *   age: (val) => validateNumber(val, 'age')
 * });
 * validateProps({ name: 'John', age: 30 });
 */
export function createPropValidator(propTypes) {
	return function validateProps(props) {
		if (process.env.NODE_ENV !== 'production') {
			for (const key in propTypes) {
				if (key in props) {
					try {
						propTypes[key](props[key]);
					} catch (error) {
						console.error(`Prop validation failed for "${key}":`, error.message);
					}
				}
			}
		}
	};
}
