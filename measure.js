require('console.table')
const sites = require('./sites.json')
const exec = require('child_process').exec

function formatSize(size) {
    var i = Math.floor( Math.log(size) / Math.log(1024) )
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB'][i]
}

async function measureDocumentSizeOverTheWire(url) {
    var command = `curl -H "Accept-Encoding: gzip, deflate, br" -s -o null -w "%{size_download}" ${url}`
    var result = await new Promise((resolve, reject) => exec(command, (error, stdout, stderr) => error ? reject(error) : resolve(stdout)))
    return parseInt(result, 10)
}

(async () => {
    const measureResults = await Promise.all(sites.map(async siteParams =>
        Object.assign({}, siteParams, {size: await measureDocumentSizeOverTheWire(siteParams.url)})))

    const formattedResults = measureResults
        .sort((a, b) => a.siteName.localeCompare(b.siteName))
        .map(({siteName, size}) => [siteName, formatSize(size)])

    console.table(['Site', 'Html size (gzipped)'], formattedResults)
})();
