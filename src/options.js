/** @type {import('./internal').Options}  */
const options = {
	_render(c) {
		return c.render(c.props, c.state, c.context);
	}
};

export default options;
