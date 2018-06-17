## Test html size over the wire for a control group of sites
- install: `npm i`
- run with current production: `node measure`
- run with latest RC: `node measure -latest`
- run with custom react version: `node measure -rc {version}`
- run and append results to csv: `node measure -log {filename}`

example: `node measure -log results/htmlSizes.csv -rc 1.3849.0`
