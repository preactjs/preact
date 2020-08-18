// import afterFrame from "../node_modules/afterframe/dist/afterframe.module.js";
import afterFrame from 'afterframe';

export { afterFrame };

let promise = null;
export function afterFrameAsync() {
	if (promise === null) {
		promise = new Promise(resolve =>
			afterFrame(time => {
				promise = null;
				resolve(time);
			})
		);
	}

	return promise;
}

export function getRowIdSel(index) {
	return `tbody > tr:nth-child(${index}) > td:first-child`;
}

export function getRowLinkSel(index) {
	return `tbody > tr:nth-child(${index}) > td:nth-child(2) > a`;
}

/**
 * @param {string} selector
 * @returns {Element}
 */
export function getBySelector(selector) {
	const element = document.querySelector(selector);
	if (element == null) {
		throw new Error(`Could not find element matching selector: ${selector}`);
	}

	return element;
}

export function testElement(selector) {
	const testElement = document.querySelector(selector);
	if (testElement == null) {
		throw new Error(
			'Test failed. Rendering after one paint was not successful'
		);
	}
}

export function testElementText(selector, expectedText) {
	const elm = document.querySelector(selector);
	if (elm == null) {
		throw new Error('Could not find element matching selector: ' + selector);
	}

	if (elm.textContent != expectedText) {
		throw new Error(
			`Element did not have expected text. Expected: '${expectedText}' Actual: '${elm.textContent}'`
		);
	}
}

export function testElementTextContains(selector, expectedText) {
	const elm = getBySelector(selector);
	if (!elm.textContent.includes(expectedText)) {
		throw new Error(
			`Element did not include expected text. Expected to include: '${expectedText}' Actual: '${elm.textContent}'`
		);
	}
}

export function isPreactX(createElement) {
	const vnode = createElement('div', {});
	return vnode.constructor === undefined;
}
