require('console.table')
const sites = require('./sites.json')
const versionUtils = require('./versionUtils')
const  fs = require('fs-extra');
const exec = require('child_process').exec
const {ungzip} = require('node-gzip');

function formatSize(size) {
    var i = Math.floor( Math.log(size) / Math.log(1024) )
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB'][i]
}

async function downloadAndAnalizeHtml(siteName, url) {
    const fileName = `htmlFiles/${siteName}.html`
    const command = `curl -H "Accept-Encoding: gzip, deflate, br" -s -o "${fileName}" ${url}`
    await new Promise((resolve, reject) => exec(command, (error, stdout, stderr) => error ? reject(error) : resolve()))

    const buffer = await fs.readFile(fileName)
    const decompressedBuffer = await ungzip(buffer)
    const isClientRendered = decompressedBuffer.toString().indexOf('var warmupData =') === -1;
    return {
        size: buffer.length,
        actualSize: decompressedBuffer.length,
        isClientRendered
    }
}

async function getUrlParams() {
    if (process.argv[2] === '-l' || process.argv[2] === '--latest') {
        return `?ReactSource=${await versionUtils.getRecentVersion()}`
    }
    if (process.argv[2] === '-R' || process.argv[2] === '--ReactSource') {
        return `?ReactSource=${process.argv[3]}`
    }
    return ''
}

(async () => {
    const urlParams = await getUrlParams()
    const measureResults = await Promise.all(sites.map(async siteParams => {
        const url = `${siteParams.url}${urlParams}`
        const result = await downloadAndAnalizeHtml(siteParams.siteName, url)
        return Object.assign({}, siteParams, result, {url})
    }))

    const formattedResults = measureResults
        .sort((a, b) => a.siteName.localeCompare(b.siteName))
        .map(({siteName, size, actualSize, isClientRendered, url}) => isClientRendered ?
            [siteName, '-', '-', 'SSR Fail', url] :
            [siteName, formatSize(size), formatSize(actualSize), '\u2713', url])

    console.table(['Site', 'Compressed size', 'Actual size', 'SSR status', 'url'], formattedResults)
})();
