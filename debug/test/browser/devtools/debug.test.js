import { expect } from 'chai';
import { fromSnapshot, toStringTable } from '../../../src/devtools/10/debug';
import {
	ADD_ROOT,
	HTML_ELEMENT,
	ADD_VNODE,
	UPDATE_VNODE_TIMINGS,
	REMOVE_VNODE,
	REORDER_CHILDREN
} from '../../../src/devtools/10/constants';

describe('debug', () => {
	describe('fromSnapshot', () => {
		it("should parse 'rootId'", () => {
			const root = 1;
			expect(fromSnapshot(['rootId: ' + root])).to.deep.equal([
				root,
				0,
				ADD_ROOT,
				root
			]);
		});

		it("should parse 'Add node'", () => {
			const root = 1;
			expect(
				fromSnapshot(['rootId: ' + root, 'Add 2 <div> to parent ' + root])
			).to.deep.equal([
				root,
				...toStringTable('div'),
				ADD_ROOT,
				root,
				ADD_VNODE,
				2,
				HTML_ELEMENT,
				1,
				9999,
				1,
				0
			]);
		});

		it("should parse 'Update timings'", () => {
			const root = 1;
			expect(
				fromSnapshot(['rootId: ' + root, 'Update timings 2 duration 12'])
			).to.deep.equal([root, 0, ADD_ROOT, root, UPDATE_VNODE_TIMINGS, 2, 12]);
		});

		it("should parse 'Remove node'", () => {
			const root = 1;
			expect(fromSnapshot(['rootId: ' + root, 'Remove 2'])).to.deep.equal([
				root,
				0,
				REMOVE_VNODE,
				1,
				2,
				ADD_ROOT,
				root
			]);
		});

		it("should parse multiple 'Remove node'", () => {
			const root = 1;
			expect(
				fromSnapshot(['rootId: ' + root, 'Remove 2', 'Remove 3'])
			).to.deep.equal([root, 0, REMOVE_VNODE, 2, 2, 3, ADD_ROOT, root]);
		});

		it("should parse 'Reordering'", () => {
			const root = 1;
			expect(
				fromSnapshot(['rootId: ' + root, 'Reorder 2 [3, 4, 5]'])
			).to.deep.equal([
				root,
				0,
				ADD_ROOT,
				root,
				REORDER_CHILDREN,
				2,
				3,
				3,
				4,
				5
			]);
		});
	});
});
