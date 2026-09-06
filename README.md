> [!NOTE]
> This is the branch for the upcoming release, for patches to v10 you need the [v10.x branch](https://github.com/preactjs/preact/tree/v10.x)

<p align="center">
<a href="https://preactjs.com" target="_blank">

![Preact](https://raw.githubusercontent.com/preactjs/preact/8b0bcc927995c188eca83cba30fbc83491cc0b2f/logo.svg?sanitize=true 'Preact')

</a>
</p>
<p align="center">Fast <b>4kB</b> alternative to React with the same modern API.</p>

**All the power of Virtual DOM components, without the overhead:**

- Familiar React API & patterns: ES6 Class, hooks, and Functional Components
- Extensive React compatibility via a simple [preact/compat] alias
- Everything you need: JSX, <abbr title="Virtual DOM">VDOM</abbr>, [DevTools], <abbr title="Hot Module Replacement">HMR</abbr>, <abbr title="Server-Side Rendering">SSR</abbr>.
- Highly optimized diff algorithm and seamless hydration from Server Side Rendering
- Supports all modern browsers
- Transparent asynchronous rendering with a pluggable scheduler

### 💁 More information at the [Preact Website ➞](https://preactjs.com)

<table border="0">
<tbody>
<tr>
<td>

[![npm](https://img.shields.io/npm/v/preact.svg)](https://www.npmjs.com/package/preact)
[![Preact Slack Community](https://img.shields.io/badge/Slack%20Community-preact.slack.com-blue)](https://chat.preactjs.com)
[![OpenCollective Backers](https://opencollective.com/preact/backers/badge.svg)](#backers)
[![OpenCollective Sponsors](https://opencollective.com/preact/sponsors/badge.svg)](#sponsors)

[![coveralls](https://img.shields.io/coveralls/preactjs/preact/main.svg)](https://coveralls.io/github/preactjs/preact)
[![gzip size](https://img.badgesize.io/https://unpkg.com/preact/dist/preact.mjs?compression=gzip&label=gzip)](https://unpkg.com/preact/dist/preact.mjs)
[![brotli size](https://img.badgesize.io/https://unpkg.com/preact/dist/preact.mjs?compression=brotli&label=brotli)](https://unpkg.com/preact/dist/preact.mjs)

</td>
</tr>
</tbody>
</table>

You can find some awesome libraries in the [awesome-preact list](https://github.com/preactjs/awesome-preact) :sunglasses:

---

## Getting Started

> 💁 _**Note:** You [don't need ES2015 to use Preact](https://github.com/developit/preact-in-es3)... but give it a try!_

#### Tutorial: Building UI with Preact

With Preact, you create user interfaces by assembling trees of components and elements. Components are functions or classes that return a description of what their tree should output. These descriptions are typically written in [JSX](https://react.dev/learn/writing-markup-with-jsx) (shown underneath), or [HTM](https://github.com/developit/htm) which leverages standard JavaScript Tagged Templates. Both syntaxes can express trees of elements with "props" (similar to HTML attributes) and children.

To get started using Preact, first look at the render() function. This function accepts a tree description and creates the structure described. Next, it appends this structure to a parent DOM element provided as the second argument. Future calls to render() will reuse the existing tree and update it in-place in the DOM. Internally, render() will calculate the difference from previous outputted structures in an attempt to perform as few DOM operations as possible.

```js
import { h, render } from 'preact';
// Tells babel to use h for JSX. It's better to configure this globally.
// See https://babeljs.io/docs/en/babel-plugin-transform-react-jsx#usage
// In tsconfig you can specify this with the jsxFactory
/** @jsx h */

// create our tree and append it to document.body:
render(
	<main>
		<h1>Hello</h1>
	</main>,
	document.body
);

// update the tree in-place:
render(
	<main>
		<h1>Hello World!</h1>
	</main>,
	document.body
);
// ^ this second invocation of render(...) will use a single DOM call to update the text of the <h1>
```

Hooray! render() has taken our structure and output a User Interface! This approach demonstrates a simple case, but would be difficult to use as an application grows in complexity. Each change would be forced to calculate the difference between the current and updated structure for the entire application. Components can help here – by dividing the User Interface into nested Components each can calculate their difference from their mounted point. Here's an example:

```js
import { render, h } from 'preact';
import { useState } from 'preact/hooks';

/** @jsx h */

const App = () => {
	const [input, setInput] = useState('');

	return (
		<div>
			<p>Do you agree to the statement: "Preact is awesome"?</p>
			<input value={input} onInput={e => setInput(e.target.value)} />
		</div>
	);
};

render(<App />, document.body);
```

---

## Sponsors

Become a sponsor and get your logo on our README on GitHub with a link to your site. [[Become a sponsor](https://opencollective.com/preact#sponsor)]

<a href="https://opencollective.com/preact/sponsor/0/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/1/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/2/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/3/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/4/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/4/avatar.svg"></a>
<a href="https://snyk.co/preact" target="_blank"><img src="https://res.cloudinary.com/snyk/image/upload/snyk-marketingui/brand-logos/wordmark-logo-color.svg" width="192" height="64"></a>
<a href="https://opencollective.com/preact/sponsor/5/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/6/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/7/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/8/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/9/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/10/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/10/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/11/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/11/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/12/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/12/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/13/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/13/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/14/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/14/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/15/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/15/avatar.svg"></a>
<a href="https://github.com/guardian" target="_blank"> &nbsp; &nbsp; &nbsp; <img src="https://github.com/guardian.png" width="64" height="64"> &nbsp; &nbsp; &nbsp; </a>
<a href="https://www.sent.dm" target="_blank"><img src="https://github.com/sentdm.png?size=64" alt="SentDM" width="64" height="64" hspace="96"></a>
<a href="https://www.songsterr.com/" target="_blank"><img src="https://github.com/songsterr.png?size=64" alt="Songsterr" width="64" height="64" hspace="96"></a>
<a href="https://deno.land" target="_blank"><img src="https://github.com/denoland.png?size=64" alt="Deno" width="64" height="64" hspace="96"></a>
<a href="https://opencollective.com/preact/sponsor/16/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/16/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/17/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/17/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/18/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/18/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/19/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/19/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/20/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/20/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/21/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/21/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/22/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/22/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/23/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/23/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/24/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/24/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/25/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/25/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/26/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/26/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/27/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/27/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/28/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/28/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/29/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/29/avatar.svg"></a>

## Backers

Support us with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/preact#backer)]

<a href="https://opencollective.com/preact/backer/0/website" target="_blank"><img src="https://opencollective.com/preact/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/1/website" target="_blank"><img src="https://opencollective.com/preact/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/2/website" target="_blank"><img src="https://opencollective.com/preact/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/3/website" target="_blank"><img src="https://opencollective.com/preact/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/4/website" target="_blank"><img src="https://opencollective.com/preact/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/5/website" target="_blank"><img src="https://opencollective.com/preact/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/6/website" target="_blank"><img src="https://opencollective.com/preact/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/7/website" target="_blank"><img src="https://opencollective.com/preact/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/8/website" target="_blank"><img src="https://opencollective.com/preact/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/9/website" target="_blank"><img src="https://opencollective.com/preact/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/10/website" target="_blank"><img src="https://opencollective.com/preact/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/11/website" target="_blank"><img src="https://opencollective.com/preact/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/12/website" target="_blank"><img src="https://opencollective.com/preact/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/13/website" target="_blank"><img src="https://opencollective.com/preact/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/14/website" target="_blank"><img src="https://opencollective.com/preact/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/15/website" target="_blank"><img src="https://opencollective.com/preact/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/16/website" target="_blank"><img src="https://opencollective.com/preact/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/17/website" target="_blank"><img src="https://opencollective.com/preact/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/18/website" target="_blank"><img src="https://opencollective.com/preact/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/19/website" target="_blank"><img src="https://opencollective.com/preact/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/20/website" target="_blank"><img src="https://opencollective.com/preact/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/21/website" target="_blank"><img src="https://opencollective.com/preact/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/22/website" target="_blank"><img src="https://opencollective.com/preact/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/23/website" target="_blank"><img src="https://opencollective.com/preact/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/24/website" target="_blank"><img src="https://opencollective.com/preact/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/25/website" target="_blank"><img src="https://opencollective.com/preact/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/26/website" target="_blank"><img src="https://opencollective.com/preact/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/27/website" target="_blank"><img src="https://opencollective.com/preact/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/28/website" target="_blank"><img src="https://opencollective.com/preact/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/29/website" target="_blank"><img src="https://opencollective.com/preact/backer/29/avatar.svg"></a>

---

## License

MIT

[![Preact](https://i.imgur.com/YqCHvEW.gif)](https://preactjs.com)

[preact/compat]: https://github.com/preactjs/preact/tree/main/compat
[hyperscript]: https://github.com/dominictarr/hyperscript
[DevTools]: https://github.com/preactjs/preact-devtools


## 🌐 Web Resources & Interactive Index
- [SPRUNKI TORCHES MAZE](https://learnquester.pages.dev/sprunki-torches-maze.html)
- [BLOCK CRAFT 3D](https://iskillplay.web.app/block-craft-3d.html)
- [BEAM DRIVE CAR CRASH TEST SIMULATOR](https://thequizzone.pages.dev/beam-drive-car-crash-test-simulator.html)
- [URBAN ASSAULT FORCE](https://thelearnquesters.pages.dev/urban-assault-force.html)
- [PANDA RESTAURANT](https://thelearnquesters.pages.dev/panda-restaurant.html)
- [RUNIC BLOCK COLLAPSE](https://learnquesters.pages.dev/runic-block-collapse.html)
- [CATEGORY ART](https://thequizzone.pages.dev/category-art.html)
- [SQUID GAME PLAYGROUND SHOOTER](https://thelearnquesters.pages.dev/squid-game-playground-shooter.html)
- [DRAGON JOUST](https://learnquesters.pages.dev/dragon-joust.html)
- [MOBILE LEGENDS SLIME 3V3](https://learnquesters.pages.dev/mobile-legends-slime-3v3.html)
- [FARMER PEDRO](https://learnquesters.pages.dev/farmer-pedro.html)
- [CATEGORY BASKETBALL](https://learnquesters.pages.dev/category-basketball.html)
- [IDLE TRADE ROUTES](https://learnquester.pages.dev/idle-trade-routes.html)
- [ELEMENTAL GLOVES MAGIC POWER](https://thelearnquesters.pages.dev/elemental-gloves-magic-power.html)
- [BESTIES CHINESE NEW YEAR CELEBRATION](https://learnquester.pages.dev/besties-chinese-new-year-celebration.html)
- [K WEDDING DREAM](https://learnquesters.pages.dev/k-wedding-dream.html)
- [GLOVES OF BLOCK](https://thelearnquesters.pages.dev/gloves-of-block.html)
- [REAL GT RACING SIMULATOR](https://learnquester.pages.dev/real-gt-racing-simulator.html)
- [ARCHER DUNGEON HERO](https://learnquesters.pages.dev/archer-dungeon-hero.html)
- [MONSTER IMPACT](https://thelearnquesters.pages.dev/monster-impact.html)
- [MERGE HERO SURVIVAL TOWER DEFENSE](https://quizverses-9d2f2.web.app/merge-hero-survival-tower-defense.html)
- [SHIP CONTROL 3D](https://learnquesters.pages.dev/ship-control-3d.html)
- [K WEDDING DREAM](https://quizverses.github.io/k-wedding-dream.html)
- [SNAKEMAXX](https://thelearnquesters.pages.dev/snakemaxx.html)
- [ACCURATE 2D](https://thelearnquesters.pages.dev/accurate-2d.html)
- [RESTAURANT SIMULATOR BURGERS PIZZA](https://quizverses.github.io/restaurant-simulator-burgers-pizza.html)
- [JUST DICE RANDOM TOWER DEFENCE](https://studyquesthub.web.app/just-dice-random-tower-defence.html)
- [INDEX2](https://thequizzone.pages.dev/index2.html)
- [CATEGORY MONSTER206](https://quizverses.github.io/category-monster206.html)
- [BIG HEAD](https://thelearnquesters.pages.dev/big-head.html)
- [DOCTOR CHICKEN](https://studyquests.github.io/doctor-chicken.html)
- [TUNG TUNG SAHUR COLORING BOOK](https://learnquesters.pages.dev/tung-tung-sahur-coloring-book.html)
- [COINS](https://studyquests.pages.dev/coins.html)
- [CATEGORY ADVENTURE 3](https://studyquests.pages.dev/category-adventure-3.html)
- [SUPER ROCK CLIMBER](https://thelearnquesters.pages.dev/super-rock-climber.html)
- [CATEGORY 2048](https://thequizzone.pages.dev/category-2048.html)
- [SPACEFLIGHT SIMULATOR](https://thelearnquesters.pages.dev/spaceflight-simulator.html)
- [NONOGRAM MASTER](https://quizverses.github.io/nonogram-master.html)
- [SNEAKER ART](https://studyplaying.github.io/sneaker-art.html)
- [TANK STRIKE WASTELAND ROGUE](https://thelearnquesters.pages.dev/tank-strike-wasteland-rogue.html)
- [FROG KNIGHT](https://thelearnquesters.pages.dev/frog-knight.html)
- [3D CHESS MASTER](https://thelearnquesters.pages.dev/3d-chess-master.html)
- [OBBY HALLOWEEN DANGER SKATE](https://learnquesters.pages.dev/obby-halloween-danger-skate.html)
- [CONSTRUCTION SET 3D BUILDER](https://studyplaying.github.io/construction-set-3d-builder.html)
- [INDEX31](https://studyplaying.github.io/index31.html)
- [TIKTOK TRENDS COLORED DENIM](https://quizverses.github.io/tiktok-trends-colored-denim.html)
- [VIBRANT HEARTS GLAMOUR VS PUNK](https://studyquesthub.web.app/vibrant-hearts-glamour-vs-punk.html)
- [CATEGORY FLASH 2](https://quizverses.pages.dev/category-flash-2.html)
- [GEOMETRY MISSILE](https://studyquests.pages.dev/geometry-missile.html)
- [KNOCK AND RUN 100 DOORS ESCAPE](https://learnquesters.pages.dev/knock-and-run-100-doors-escape.html)
- [THE COUNTERFEIT BANK](https://studyquests.github.io/the-counterfeit-bank.html)
- [SKY BALLS 3D](https://learnquesters.pages.dev/sky-balls-3d.html)
- [REDLINE IDLE FRONT](https://thelearnquesters.pages.dev/redline-idle-front.html)
- [ICE CREAM ROLLER](https://learnquesters.pages.dev/ice-cream-roller.html)
- [CATEGORY ART](https://quizverses.pages.dev/category-art.html)
- [CLEAN THE OCEAN](https://quizverses-9d2f2.web.app/clean-the-ocean.html)
- [PRIVACY](https://thequizzone.pages.dev/privacy.html)
- [INDEX7](https://thequizzone.pages.dev/index7.html)
- [DIAMONDZ](https://studyplaying.github.io/diamondz.html)
- [CONSOLE IDLE](https://quizverses-9d2f2.web.app/console-idle.html)
- [COUNTRYSIDE DRIVING QUEST](https://studyquests.pages.dev/countryside-driving-quest.html)
- [TRADING GAMES PLAYTIME](https://thelearnquesters.pages.dev/trading-games-playtime.html)
- [PRINCESS DRESS UP RUN](https://studyquests.pages.dev/princess-dress-up-run.html)
- [ARROW TAP PUZZLE](https://quizverses-9d2f2.web.app/arrow-tap-puzzle.html)
- [INDEX17](https://thequizzone.pages.dev/index17.html)
- [INDEX41](https://thequizzone.pages.dev/index41.html)
- [CATEGORY ESCAPE](https://studyplaying.github.io/category-escape.html)
- [PING PONG BATTLE TABLE TENNIS](https://thelearnquesters.pages.dev/ping-pong-battle-table-tennis.html)
- [CATEGORY CASUAL 14](https://quizverses.github.io/category-casual-14.html)
- [CATEGORY BIKE 3](https://thelearnquesters.pages.dev/category-bike-3.html)
- [MINI SHOOTERS](https://learnquester.pages.dev/mini-shooters.html)
- [SPOOKY HALLOWEEN HIDDEN PUMPKIN](https://thelearnquesters.pages.dev/spooky-halloween-hidden-pumpkin.html)
- [CATEGORY TOWER DEFENSE 2](https://thelearnquesters.pages.dev/category-tower-defense-2.html)
- [MERGE SMITH](https://learnquesters.pages.dev/merge-smith.html)
- [ULTIMATE BRAINROT CLICKER](https://quizverses.github.io/ultimate-brainrot-clicker.html)
- [COLOR WAVEE](https://thelearnquester.web.app/color-wavee.html)
- [THEO MORINIS MAGICAL RESORT](https://learnquester.github.io/theo-morinis-magical-resort.html)
- [PARIS KISS](https://studyplaying.github.io/paris-kiss.html)
- [INDEX2](https://thelearnquester.web.app/index2.html)
- [MEGA LAMBA RAMP](https://quizverses-9d2f2.web.app/mega-lamba-ramp.html)
- [GROW CASTLE DEFENCE](https://quizverses-9d2f2.web.app/grow-castle-defence.html)
- [STICK BOY BAZOOKA RAGDOLL](https://learnquester.github.io/stick-boy-bazooka-ragdoll.html)
- [SNIPER MASTER](https://quizverses.github.io/sniper-master.html)
- [SHAPE TRANSFORMING SHIFTING RUN](https://studyplaying.github.io/shape-transforming-shifting-run.html)
- [CATEGORY PUZZLE 3](https://thelearnquester.web.app/category-puzzle-3.html)
- [HAPPY FARM THE CROP](https://quizverses-9d2f2.web.app/happy-farm-the-crop.html)
- [WOODLAND SLIDE](https://studyquests.pages.dev/woodland-slide.html)
- [CATEGORY HUNTING16](https://thelearnquesters.pages.dev/category-hunting16.html)
- [INDEX5](https://studyquesthub.web.app/index5.html)
- [CATEGORY DRAWING34](https://thelearnquester.web.app/category-drawing34.html)
- [TILEMAN IO](https://thelearnquester.web.app/tileman-io.html)
- [FALLING ART RAGDOLL SIMULATOR](https://learnquester.pages.dev/falling-art-ragdoll-simulator.html)
- [BALING BUM](https://learnquesters.pages.dev/baling-bum.html)
- [FASHION HEROES ACADEMY](https://studyquesthub.web.app/fashion-heroes-academy.html)
- [CARJAMCOLOR](https://quizverses.github.io/carjamcolor.html)
- [GLOBAL CITY QKK](https://thelearnquesters.pages.dev/global-city-qkk.html)
- [TOYTOPIA](https://studyplaying.github.io/toytopia.html)
- [UNSTACK TOWER](https://learnquester.pages.dev/unstack-tower.html)
- [PHANTOM THIEF CAT RUNNING](https://learnquester.github.io/phantom-thief-cat-running.html)
- [GUMMY MERGE](https://learnquester.github.io/gummy-merge.html)
- [ITALIAN BRAINROT QUIZ](https://learnquester.github.io/italian-brainrot-quiz.html)
- [LINKLINK](https://learnquester.github.io/linklink.html)
- [SEA LORDS](https://thelearnquesters.pages.dev/sea-lords.html)
- [INDEX13](https://thelearnquester.web.app/index13.html)
- [GLAM GURU PUZZLE COLLECTION](https://quizverses.github.io/glam-guru-puzzle-collection.html)
- [CONSTRUCTION SIMULATOR](https://studyquests.github.io/construction-simulator.html)
- [CATEGORY SOCCER60](https://thelearnquester.web.app/category-soccer60.html)
- [FUN MINI GAMES FOR KIDS](https://studyquests.github.io/fun-mini-games-for-kids.html)
- [FLICK SHOT SOCCER](https://studyplaying.github.io/flick-shot-soccer.html)
- [QUEEN OF MAHJONG](https://quizverses-9d2f2.web.app/queen-of-mahjong.html)
- [CATEGORY GUN241](https://quizverses-9d2f2.web.app/category-gun241.html)
- [CUT THE ROPE TIME TRAVEL](https://themindplay.pages.dev/cut-the-rope-time-travel.html)
- [BLUE MUSHROOM CAT RUN](https://themindplay.pages.dev/blue-mushroom-cat-run.html)
- [BOMB HEAD HOT POTATO](https://learnquester.github.io/bomb-head-hot-potato.html)
- [NONOGRAM MASTER](https://quizverses-9d2f2.web.app/nonogram-master.html)
- [MINECRAFT BATTLE PARTY](https://iskillquest.pages.dev/minecraft-battle-party.html)
- [ROPE SORTING](https://quizverses.github.io/rope-sorting.html)
- [SPRUNKI FIND THE DIFFERENCES](https://studyplaying.github.io/sprunki-find-the-differences.html)
- [LABUBU AND TREASURES FUN ADVENTURE](https://thelearnquesters.pages.dev/labubu-and-treasures-fun-adventure.html)
- [CATEGORY MOUSE1 699](https://themindplay.github.io/category-mouse1-699.html)
- [MONSTER TRUCK CRUSH](https://quizverses-9d2f2.web.app/monster-truck-crush.html)
- [BLOXORZ BLOCK PUZZLE 3D](https://iskillquest.pages.dev/bloxorz-block-puzzle-3d.html)
- [CATEGORY BATTLE 3](https://thelearnquesters.pages.dev/category-battle-3.html)
- [1010 ELIXIR ALCHEMY](https://themindplay.pages.dev/1010-elixir-alchemy.html)
- [INDEX23](https://thequizzone.pages.dev/index23.html)
- [JUST LUDO](https://learnquester.github.io/just-ludo.html)
- [FIND IT FIND THE DIFFERENCES](https://iskillquest.pages.dev/find-it-find-the-differences.html)
- [SWEET HAUNT 2](https://themindplay.pages.dev/sweet-haunt-2.html)
- [IDLE TOWN BILLIONAIRE](https://thelearnquesters.pages.dev/idle-town-billionaire.html)
- [COLOR NUTS BOLTS PUZZLE](https://themindplay.github.io/color-nuts-bolts-puzzle.html)
