import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { h, render } from 'preact';
import { initDevTools } from '../../../src/devtools';
import { createMockDevtoolsHook } from './mock-hook';
import { createIdMapper, createLinker, clearVNode } from '../../../src/devtools/cache';

/** @jsx h */

function getRendered(scratch) {
	return scratch._children._children[0];
}

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let teardownDevtools;

	beforeEach(() => {
		createMockDevtoolsHook();
		teardownDevtools = initDevTools();
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
		teardownDevtools();
	});

	describe('idMapper', () => {
		it('should not start with 0', () => {
			render(<div />, scratch);

			const m = createIdMapper();
			expect(m.getId(getRendered(scratch))).to.equal(1);
		});

		it('should get vnode by id', () => {
			render(<div />, scratch);
			const vnode = getRendered(scratch);
			const m = createIdMapper();

			m.getId(vnode);
			expect(m.getVNode(1)).to.deep.equal(vnode);

			// Return null if not found
			expect(m.getVNode(999)).to.equal(null);
		});

		it('should check if the vnode is know', () => {
			render(<div />, scratch);
			const vnode = getRendered(scratch);
			const m = createIdMapper();

			expect(m.hasId(vnode)).to.equal(false);

			m.getId(vnode);
			expect(m.hasId(vnode)).to.equal(true);
		});

		it('should remove a vnode', () => {
			render(<div />, scratch);
			const vnode = getRendered(scratch);
			const m = createIdMapper();
			const id = m.getId(vnode);

			m.remove(vnode);

			expect(m.hasId(vnode)).to.equal(false);
			expect(m.getVNode(id)).to.equal(null);
		});
	});

	describe('Linker', () => {
		it('should return no children when not in cache', () => {
			const linker = createLinker();
			expect(linker.get(1)).to.deep.equal([]);
		});

		it('should link ids', () => {
			const linker = createLinker();
			linker.link(1, 2);
			linker.link(1, 3);

			expect(linker.get(1)).to.deep.equal([2, 3]);
		});

		it('should unlink ids', () => {
			const linker = createLinker();
			linker.link(1, 2);
			linker.link(1, 3);
			linker.unlink(1, 2);
			linker.unlink(999, 3);

			expect(linker.get(1)).to.deep.equal([3]);
		});

		it('should remove link', () => {
			const linker = createLinker();
			linker.link(1, 2);
			linker.link(1, 3);
			linker.link(10, 1);
			linker.link(10, 1);

			linker.remove(1);
			expect(linker.get(10)).to.deep.equal([]);
		});
	});

	describe('clearVNode', () => {
		it('should not fail when vnode has no children', () => {
			render(<div />, scratch);
			const vnode = getRendered(scratch);
			const m = createIdMapper();
			const l = createLinker();

			const id = m.getId(vnode);

			clearVNode(m, l, vnode);

			expect(m.getVNode(id)).to.equal(null);
		});

		it('should recursively delete from caches', () => {
			render(<div>foo</div>, scratch);
			const vnode = getRendered(scratch);
			const text = vnode._children[0];

			const m = createIdMapper();
			const id = m.getId(vnode);
			const idText = m.getId(text);

			const l = createLinker();
			l.link(id, idText);

			clearVNode(m, l, vnode);

			expect(m.getVNode(id)).to.equal(null);
			expect(m.getVNode(idText)).to.equal(null);

			expect(l.get(id)).to.deep.equal([]);
			expect(l.get(idText)).to.deep.equal([]);
		});
	});
});
