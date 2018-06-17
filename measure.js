require('console.table')
const sites = require('./sites.json')
const versionUtils = require('./versionUtils')
const  fs = require('fs-extra');
const exec = require('child_process').exec
const {ungzip} = require('node-gzip');
const dateTime = require('node-datetime');

function formatSize(size) {
    var i = Math.floor( Math.log(size) / Math.log(1024) )
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB'][i]
}

async function downloadAndAnalizeHtml(siteName, url) {
    const fileName = `htmlFiles/${siteName}`
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

function getArgs() {
    const args = {}
    if (process.argv.includes('-latest')) {
        args.latest = true
    }
    if (process.argv.includes('-rc')) {
        args.rc = process.argv[process.argv.indexOf('-rc') + 1]
    }
    if (process.argv.includes('-log')) {
        args.log = process.argv[process.argv.indexOf('-log') + 1]
    }
    return args
}

async function getUrlParams() {
    const args = getArgs()
    if (args.latest) {
        return `?ReactSource=${await versionUtils.getRecentVersion()}`
    }
    if (args.rc) {
        return `?ReactSource=${args.rc}`
    }
    return ''
}

function getCurrentDate() {
    var dt = dateTime.create()
    return dt.format('Y-m-d H:M:S')
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

    const args = getArgs()
    if (args.log) {
        const rc = args.rc || (!args.latest && 'prod') || await versionUtils.getRecentVersion()
        const date = getCurrentDate()
        const data = formattedResults.map(res => res.slice(0, 4).concat([rc, date]).join(',')).join('\n')
        await fs.appendFile(args.log, `\n${data}`)
    }

    console.table(['Site', 'Compressed size', 'Actual size', 'SSR status', 'url'], formattedResults)
})();
