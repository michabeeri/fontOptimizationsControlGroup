'use strict'
const _ = require('lodash')
const fetch = require('node-fetch')
const parser = require('xml2json')

const VERSION_PATTERN = /\d+\.\d+\.\d+/
const DEFAULT_SNAPSHOT_LOCATION = 'https://repo.dev.wixpress.com/artifactory/wix-releases/com/wixpress/html-client/santa/'
const VERSION_UPLOADING_INTERVAL = 2 // use 2 versions before the latest to make sure that we run on uploaded version


function getRecentVersionFromArtifactMaven(xml) {
    const json = parser.toJson(xml)
    const artifactMavenMetadata = JSON.parse(json)
    const latestVersion = _.head(VERSION_PATTERN.exec(artifactMavenMetadata.metadata.versioning.latest))
    return getSafeVersion(latestVersion)
}

function getArtifactMaven(snapshotLocation) {
    const artifactMavenMetadataPath = `${snapshotLocation}/maven-metadata.xml`
    return new Promise((resolve, reject) => {
        fetch(artifactMavenMetadataPath)
            .then(response => response.buffer())
            .then(resolve)
            .catch(reject)
    })
}

function getSafeVersion(version) {
    const chunks = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
    const uploadedMinorVersion = _.toNumber(chunks[2]) - VERSION_UPLOADING_INTERVAL
    return chunks.length === 4 ? `${_.toNumber(chunks[1])}.${uploadedMinorVersion}.${_.toNumber(chunks[3])}` : version
}

function getRecentVersion(snapshotLocation = DEFAULT_SNAPSHOT_LOCATION) {
    return new Promise((resolve, reject) => {
        getArtifactMaven(snapshotLocation)
            .then((artifactMaven) => resolve(getRecentVersionFromArtifactMaven(artifactMaven)))
            .catch(reject)
    })
}

module.exports = {
    getRecentVersion
}
