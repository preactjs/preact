import { Component } from './component';
import { createElement } from './create-element';

/**
 * @typedef {{parentDom: HTMLElement, before: Comment | null }} SlotInfo
 */

export class Block extends Component {
	componentWillMount() {
		//
	}

	createHTML() {
		const str = this.props.template;
		const dom = createDomFromString(str);
		console.log(dom);
		return dom;
	}

	render() {
		return createElement(Slot, null, this.props.children);
	}
}

function Slot(props) {
	return props.children;
}

/** @typedef {{i:number, input: string}} Lexer */

const CHAR_EL_OPEN = 60; // <
const CHAR_EL_CLOSE = 62; // >
const CHAR_SLASH = 47; // /
const CHAR_EQUAL = 61; // =
const CHAR_DOUBLE_QUOTE = 34; // "

/**
 * @param {string} str
 * @returns {DocumentFragment}
 */
function createDomFromString(str) {
	console.log(str);
	const root = document.createDocumentFragment();

	/** @type {Array<DocumentFragment|HTMLElement | Text>} */
	const elementStack = [root];

	/** @type {Lexer} */
	let lexer = { i: 0, input: str };
	while (lexer.i < lexer.input.length) {
		let char = step(lexer);

		// Check: <div> or </div>
		if (char === CHAR_EL_OPEN) {
			// Check: </div>
			if (peek(lexer) === CHAR_SLASH) {
				// TODO: Should we validate the end tag name?
				consumeUntil(lexer, CHAR_EL_CLOSE);
				elementStack.pop();
				continue;
			}

			// Check: div or div-foo
			let name = parseTagName(lexer);
			// Optional whitespace
			char = consumeWhiteSpace(lexer);

			// TODO: Ignore <script>-tags
			const el = document.createElement(name);
			elementStack[elementStack.length - 1].appendChild(el);
			elementStack.push(el);

			// Check: > in <div>
			if (char === CHAR_EL_CLOSE) {
				lexer.i++;
				continue;
			}
			// Check: /> in <div />
			else if (char === CHAR_SLASH) {
				expectChar(lexer, CHAR_EL_CLOSE);
				continue;
			} else {
				// TODO: Attributes
				let start = lexer.i - 1;
				while (
					lexer.i < lexer.input.length &&
					!isWhitespace(char) &&
					char !== CHAR_EQUAL
				) {
					char = step(lexer);
				}

				const attrName = lexer.input.slice(start, lexer.i - 1);
				if (char === CHAR_EQUAL) {
					expectChar(lexer, CHAR_DOUBLE_QUOTE);
					const start = lexer.i;

					consumeUntil(lexer, CHAR_DOUBLE_QUOTE);

					const attrValue = lexer.input.slice(start, lexer.i - 1);
					el.setAttribute(attrName, attrValue);
				}
			}

			consumeWhiteSpace(lexer);
			expectChar(lexer, CHAR_EL_CLOSE);
		} else {
			// Text, can be anything until <
			const start = lexer.i - 1;
			while (lexer.i < lexer.input.length) {
				const char = step(lexer);
				if (char === CHAR_EL_OPEN) {
					lexer.i--;
					break;
				}
			}

			const text = new Text(lexer.input.slice(start, lexer.i));
			elementStack[elementStack.length - 1].appendChild(text);
		}
	}

	return root;
}

/**
 * @param {Lexer} lexer
 * @param {number} expected
 */
function expectChar(lexer, expected) {
	const char = lexer.input.charCodeAt(lexer.i);
	if (char !== expected) {
		throw new Error('invalid ' + expected + ', ' + lexer.input.slice(lexer.i));
	}
	lexer.i++;
}

/**
 * @param {Lexer} lexer
 * @returns {string}
 */
function parseTagName(lexer) {
	let start = lexer.i;
	let code = peek(lexer);
	while (lexer.i < lexer.input.length) {
		if (
			!(
				(code >= 65 && code <= 90) ||
				(code >= 97 && code <= 122) ||
				(lexer.i !== start && ((code >= 48 && code <= 57) || code === 45))
			)
		) {
			break;
		}

		code = step(lexer);
	}

	lexer.i--;
	const end = lexer.i;
	const name = lexer.input.slice(start, end);
	if (name === '') {
		throw new Error('Empty name');
	}

	return name;
}

/**
 * @param {Lexer} lexer
 * @param {number} expected
 */
function consumeUntil(lexer, expected) {
	while (lexer.i < lexer.input.length) {
		const char = step(lexer);
		if (char === expected) {
			return;
		}
	}

	throw new Error('Not found ' + String.fromCharCode(expected));
}

/**
 * @param {Lexer} lexer
 * @returns {number}
 */
function peek(lexer) {
	return lexer.input.charCodeAt(lexer.i);
}

/**
 * @param {Lexer} lexer
 * @returns {number}
 */
function step(lexer) {
	const char = lexer.input.charCodeAt(lexer.i);
	lexer.i++;
	return char;
}

/**
 * @param {number} char
 * @returns {boolean}
 */
function isWhitespace(char) {
	return char === 32 || char === 9 || char === 10 || char === 13;
}

/**
 * @param {Lexer} lexer
 * @returns {number}
 */
function consumeWhiteSpace(lexer) {
	let char = lexer.input.charCodeAt(lexer.i);
	while (lexer.i < lexer.input.length && isWhitespace(char)) {
		char = step(lexer);
	}
	return char;
}
