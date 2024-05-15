/**
 * Serialize contents
 * @typedef {string | number | Array<string | number>} Contents
 * @param {Contents} contents
 */
const serialize = contents =>
	Array.isArray(contents) ? contents.join('') : contents.toString();

/**
 * A helper to generate innerHTML validation strings containing spans
 * @param {Contents} contents The contents of the span, as a string
 */
export const span = contents => `<span>${serialize(contents)}</span>`;

/**
 * A helper to generate innerHTML validation strings containing divs
 * @param {Contents} contents The contents of the div, as a string
 */
export const div = contents => `<div>${serialize(contents)}</div>`;

/**
 * A helper to generate innerHTML validation strings containing p
 * @param {Contents} contents The contents of the p, as a string
 */
export const p = contents => `<p>${serialize(contents)}</p>`;

/**
 * A helper to generate innerHTML validation strings containing sections
 * @param {Contents} contents The contents of the section, as a string
 */
export const section = contents => `<section>${serialize(contents)}</section>`;

/**
 * A helper to generate innerHTML validation strings containing uls
 * @param {Contents} contents The contents of the ul, as a string
 */
export const ul = contents => `<ul>${serialize(contents)}</ul>`;

/**
 * A helper to generate innerHTML validation strings containing ols
 * @param {Contents} contents The contents of the ol, as a string
 */
export const ol = contents => `<ol>${serialize(contents)}</ol>`;

/**
 * A helper to generate innerHTML validation strings containing lis
 * @param {Contents} contents The contents of the li, as a string
 */
export const li = contents => `<li>${serialize(contents)}</li>`;

/**
 * A helper to generate innerHTML validation strings containing inputs
 */
export const input = () => `<input type="text">`;

/**
 * A helper to generate innerHTML validation strings containing h1
 * @param {Contents} contents The contents of the h1
 */
export const h1 = contents => `<h1>${serialize(contents)}</h1>`;

/**
 * A helper to generate innerHTML validation strings containing h2
 * @param {Contents} contents The contents of the h2
 */
export const h2 = contents => `<h2>${serialize(contents)}</h2>`;
