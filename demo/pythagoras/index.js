import { createElement, Component } from 'preact';
import { select as d3select, mouse as d3mouse } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import Pythagoras from './pythagoras';

export default class PythagorasDemo extends Component {
	svg = {
		width: 1280,
		height: 600
	};

	state = {
		currentMax: 0,
		baseW: 80,
		heightFactor: 0,
		lean: 0
	};

	realMax = 11;

	svgRef = c => {
		this.svgElement = c;
	};

	scaleFactor = scaleLinear()
		.domain([this.svg.height, 0])
		.range([0, 0.8]);

	scaleLean = scaleLinear()
		.domain([0, this.svg.width / 2, this.svg.width])
		.range([0.5, 0, -0.5]);

	onMouseMove = event => {
		let [x, y] = d3mouse(this.svgElement);

		this.setState({
			heightFactor: this.scaleFactor(y),
			lean: this.scaleLean(x)
		});
	};

	restart = () => {
		this.setState({ currentMax: 0 });
		this.next();
	};

	next = () => {
		let { currentMax } = this.state;

		if (currentMax < this.realMax) {
			this.setState({ currentMax: currentMax + 1 });
			this.timer = setTimeout(this.next, 500);
		}
	};

	componentDidMount() {
		this.selected = d3select(this.svgElement).on('mousemove', this.onMouseMove);
		this.next();
	}

	componentWillUnmount() {
		this.selected.on('mousemove', null);
		clearTimeout(this.timer);
	}

	render({}, { currentMax, baseW, heightFactor, lean }) {
		let { width, height } = this.svg;

		return (
			<div class="App">
				<svg width={width} height={height} ref={this.svgRef}>
					<Pythagoras
						w={baseW}
						h={baseW}
						heightFactor={heightFactor}
						lean={lean}
						x={width / 2 - 40}
						y={height - baseW}
						lvl={0}
						maxlvl={currentMax}
					/>
				</svg>
			</div>
		);
	}
}
