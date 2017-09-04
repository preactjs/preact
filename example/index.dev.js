this.index = this.index || {};
this.index.dev = this.index.dev || {};
(function (preact) {
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Clock = function (_Component) {
	_inherits(Clock, _Component);

	function Clock() {
		_classCallCheck(this, Clock);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Clock.prototype.render = function render$$1() {
		var time = new Date().toLocaleTimeString();
		return preact.h(
			'span',
			null,
			time
		);
	};

	return Clock;
}(preact.Component);

preact.render(Clock, document.body);

}(preact));
//# sourceMappingURL=index.dev.js.map
