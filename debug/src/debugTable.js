import { toChildArray } from 'preact';

const FIRST_LEVEL_TAGS = ['tbody', 'thead', 'tfoot'];

export default function debugTable(children) {
	const firstLevelChildren = toChildArray(children);
	for (let i = 0; i<firstLevelChildren.length; i++) {
		const child = firstLevelChildren[i];
		if (FIRST_LEVEL_TAGS.indexOf(child.type)===-1) {
			console.error('Expected a <tbody>, <thead> or <tfoot> as the first child of <table>.');
			return;
		}
		const isHead = child.type === 'thead';
		const secondLevelChildren = toChildArray(child.props.children);
		for (let j = 0; j<secondLevelChildren.length; j++) {
			const secondLevelChild = secondLevelChildren[j];
			if (secondLevelChild.type!=='tr') {
				console.error('Expected a <tr> as a child of <tbody>,...');
				return;
			}
			const thirthLevelChildren = toChildArray(secondLevelChild.props.children);
			for (let k = 0; k<thirthLevelChildren.length; k++) {
				const thirthLevelChild = thirthLevelChildren[k];
				if (isHead && thirthLevelChild.type!=='th') {
					console.error('Expected a <th> as a child of <thead.tr>');
					return;
				}
				else if (!isHead && thirthLevelChild.type!=='td') {
					console.error('Expected a <td> as a child of <tbody/tfoot.tr>');
					return;
				}
			}
		}
	}
}
