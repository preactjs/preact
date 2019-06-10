import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import {
	getVNodeFromContainer,
	getLastRenderOutput,
	getDOMNode,
	getComponent,
} from '../../src/inspect';

/** @jsx h */

describe('inspect', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('getVNodeFromContainer', () => {
		it('returns `null` if no element is not a container for a rendered tree', () => {
			expect(h('div')).to.equal(null);
		});

		it('returns root VNode if one has been rendered into container', () => {
			render(<div someProp="someValue" />, scratch);
			const vnode = getVNodeFromContainer(scratch);
			expect(vnode).to.be.ok;
			expect(vnode.props).to.deep.equal({ someProp: 'someValue' });
		});
	});

	describe('getLastRenderOutput', () => {
		it('returns `null` if vnode has not been rendered', () => {
			const vnode = getLastRenderOutput(h('div'));
			expect(vnode).to.equal(null);
		});

		it('returns rendered vnode array for a rendered vnode', () => {
			function Comp() {
				return <div someProp="someValue" />;
			}
			render(<Comp />, scratch);
			const vnode = getVNodeFromContainer(scratch);
			const rendered = getLastRenderOutput(vnode);
			expect(rendered).to.be.ok;
			expect(rendered.length).to.equal(1);
			expect(rendered[0].type).to.equal('div');
			expect(rendered[0].props).to.deep.equal({ someProp: 'someValue' });
		});

		it('returns rendered vnode array for a component instance', () => {
			let instance;
			class Component {
				render() {
					instance = this;
					return <div />;
				}
			}
			render(<Component />, scratch);
			const rendered = getLastRenderOutput(instance);
			expect(rendered).to.be.ok;
			expect(rendered.length).to.equal(1);
			expect(rendered.type).to.equal('div');
		});
	});

	describe('getDOMNode', () => {
		it('returns `null` if vnode has not been rendered', () => {
			expect(h('div')).to.equal(null);
		});

		it('returns `null` if vnode is not a DOM element', () => {});

		it('returns DOM element', () => {});
	});

	describe('getComponent', () => {
		it('returns `null` if vnode has not been rendered', () => {
			expect(h('div')).to.equal(null);
		});

		it('returns `null` if vnode is not a component node', () => {});

		it('returns component instance if vnode is a component node', () => {});
	});
});
