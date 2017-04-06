export default function remove(el) {
	if (el.parentNode !== null)
		el.parentNode.removeChild(el);
}
