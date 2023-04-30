import { getOwnerStack } from './component-stack';
import { serializeVNode } from './debug';

/**
 * @param {import('./internal').Internal} parent
 * @returns {import('./internal').Internal | null}
 */
function getClosestDomNodeParent(parent) {
	if (!parent) return null;
	if (typeof parent.type == 'function') {
		return getClosestDomNodeParent(parent._parent);
	}
	return parent;
}

/**
 * @param {import('./internal').Internal} internal
 * @return {void}
 */
export function validateTableMarkup(internal) {
	const { type, _parent: parent } = internal;
	const parentDomInternal = getClosestDomNodeParent(parent);
	if (parentDomInternal === null) return;

	if (
		(type === 'thead' || type === 'tfoot' || type === 'tbody') &&
		parentDomInternal.type !== 'table'
	) {
		console.error(
			'Improper nesting of table. Your <thead/tbody/tfoot> should have a <table> parent.' +
				serializeVNode(internal) +
				`\n\n${getOwnerStack(internal)}`
		);
	} else if (
		type === 'tr' &&
		parentDomInternal.type !== 'thead' &&
		parentDomInternal.type !== 'tfoot' &&
		parentDomInternal.type !== 'tbody' &&
		parentDomInternal.type !== 'table'
	) {
		console.error(
			'Improper nesting of table. Your <tr> should have a <thead/tbody/tfoot/table> parent.' +
				serializeVNode(internal) +
				`\n\n${getOwnerStack(internal)}`
		);
	} else if (type === 'td' && parentDomInternal.type !== 'tr') {
		console.error(
			'Improper nesting of table. Your <td> should have a <tr> parent.' +
				serializeVNode(internal) +
				`\n\n${getOwnerStack(internal)}`
		);
	} else if (type === 'th' && parentDomInternal.type !== 'tr') {
		console.error(
			'Improper nesting of table. Your <th> should have a <tr>.' +
				serializeVNode(internal) +
				`\n\n${getOwnerStack(internal)}`
		);
	}
}
