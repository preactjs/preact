import { h } from 'preact';

function Bavaria() {
	return (
		<div>
			<span class="foo" data-testid="foo">
				Bavaria ipsum dolor sit amet gwiss Charivari Auffisteign koa. Umma
				pfenningguat vui huift vui back mas Landla Bradwurschtsemmal,
				Fingahaggln. Wolpern ja, wo samma denn wea nia ausgähd, kummt nia hoam
				baddscher i moan oiwei! Kloan pfenningguat is Charivari Bussal,
				hallelujah sog i, luja. Liberalitas Bavariae hod Schorsch om auf’n Gipfe
				gwiss naa. Und ja, wo samma denn Ohrwaschl hoggd auffi Spotzerl
				Diandldrahn, oba? Is sog i und glei wirds no fui lustiga Biaschlegl ma
				nimma ned woar gscheckate, pfenningguat! Gstanzl dei Schorsch Radi i mog
				di fei hea Reiwadatschi fensdaln dei glei a Hoiwe. Bitt umananda ghupft
				wia gsprunga Gschicht kimmt, oamoi obandeln. Sog i helfgod amoi
				hallelujah sog i, luja i hob di narrisch gean, Brodzeid. Wolln a Maß und
				no a Maß Gaudi obandln eana boarischer hallelujah sog i, luja Maßkruag
				greaßt eich nachad, Schmankal.
			</span>
			<span class="bar" data-testid="bar">
				Dei um Godds wujn naa Watschnbaam Obazda Trachtnhuat, Vergeltsgott
				Schneid Schbozal. Om auf’n Gipfe Ramasuri um Godds wujn eana. Wos
				sammawiedaguad sei Weißwiaschd da, hog di hi is des liab des umananda
				Brezn Sauakraud Diandldrahn. Vo de weida pfundig Kirwa de Sonn
				Hetschapfah Watschnpladdla auf gehds beim Schichtl Meidromml auffi lem
				und lem lossn! Watschnpladdla wolln measi obandeln griasd eich midnand
				Oachkatzlschwoaf is ma Wuascht sammawiedaguad aasgem. A so a Schmarn
				Weibaleid naa, des basd scho. Abfieseln helfgod Sauwedda middn ded
				schoo. A bissal wos gehd ollaweil Sauwedda is Servas wiavui wo hi o’ha,
				a liabs Deandl pfiad de nix. Maßkruag etza so spernzaln. Weiznglasl
				Bradwurschtsemmal da, Schdeckalfisch: Mei Musi bitt des wiad a
				Mordsgaudi kumm geh Biakriagal Greichats obacht?
			</span>
		</div>
	);
}

const content = [];
for (let i = 0; i < 1000; i++) {
	content.push(<Bavaria />);
}

export default function App() {
	return <div>{content}</div>;
}
