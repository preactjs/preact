import { h, Component } from 'preact';
import { SearchResultsItem } from './SearchResultsItem';
import { Footer } from './Footer';
import { getNextSearchResults } from './data';

export class App extends Component {
	componentDidMount() {
		window.onMount();
	}

	render() {
		const searchResultsData = getNextSearchResults();

		return (
			<div className="search-results">
				<div>
					{searchResultsData.items.map((item) => {
						return <SearchResultsItem key={item.id} item={item} />;
					})}
				</div>
				<Footer />
			</div>
		);
	}
}
