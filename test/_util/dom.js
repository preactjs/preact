/**
 * A helper to generate innerHTML validation strings containing spans
 * @param {string | number} contents The contents of the span, as a string
 */
export const span = contents => `<span>${contents}</span>`;

/**
 * A helper to generate innerHTML validation strings containing divs
 * @param {string | number} contents The contents of the div, as a string
 */
export const div = contents => `<div>${contents}</div>`;

/**
 * A helper to generate innerHTML validation strings containing p
 * @param {string | number} contents The contents of the p, as a string
 */
export const p = contents => `<p>${contents}</p>`;

/**
 * A helper to generate innerHTML validation strings containing sections
 * @param {string | number} contents The contents of the section, as a string
 */
export const section = contents => `<section>${contents}</section>`;

/**
 * A helper to generate innerHTML validation strings containing uls
 * @param {string | number} contents The contents of the ul, as a string
 */
export const ul = contents => `<ul>${contents}</ul>`;

/**
 * A helper to generate innerHTML validation strings containing ols
 * @param {string | number} contents The contents of the ol, as a string
 */
export const ol = contents => `<ol>${contents}</ol>`;

/**
 * A helper to generate innerHTML validation strings containing lis
 * @param {string | number} contents The contents of the li, as a string
 */
export const li = contents => `<li>${contents}</li>`;

/**
 * A helper to generate innerHTML validation strings containing inputs
 */
export const input = () => `<input type="text">`;

/**
 * A helper to generate innerHTML validation strings containing inputs
 * @param {string | number} contents The contents of the h1
 */
export const h1 = contents => `<h1>${contents}</h1>`;

/**
 * A helper to generate innerHTML validation strings containing inputs
 * @param {string | number} contents The contents of the h2
 */
export const h2 = contents => `<h2>${contents}</h2>`;
