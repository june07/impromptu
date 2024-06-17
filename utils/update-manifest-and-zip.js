const fs = require('fs')
const path = require('path')
const os = require('os')
const archiver = require('archiver')

const messages = require('../_locales/en/messages.json')
const package = require('../package.json')

// Define paths
const originalManifestPath = './manifest.json'
const chromeManifestPath = path.join(os.tmpdir(), 'chromeManifest.json')
const firefoxManifestPath = path.join(os.tmpdir(), 'firefoxManifest.json')

function writeChromeManifest(originalManifest) {
    const manifest = { ...originalManifest }
    // Write back updated manifest
    fs.writeFile(chromeManifestPath, JSON.stringify(manifest, null, 4), 'utf8', async (err) => {
        if (err) {
            console.error('Error writing updated manifest:', err)
            return
        }
        console.log('Manifest updated successfully.')

        // Zip files
        const output = fs.createWriteStream(`${messages.appName.message}-chrome-${manifest.version}.zip`)
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        })

        output.on('close', () => {
            console.log('Zip file created successfully.')
        })

        archive.on('error', (err) => {
            console.error('Error creating zip file:', err)
        })

        archive.pipe(output)
        archive.directory('./src', 'src')
        archive.directory('./icon', 'icon')
        archive.file(chromeManifestPath, { name: 'manifest.json' })
        archive.directory('./_locales', '_locales')

        console.log(chromeManifestPath)
        await archive.finalize()
        fs.rmSync(chromeManifestPath)
    })
}
function writeFirefoxManifest(originalManifest) {
    const firefoxManifest = { ...originalManifest }

    delete firefoxManifest.commands.toggle.global
    delete firefoxManifest.externally_connectable

    firefoxManifest.browser_specific_settings = {
        gecko: {
            id: `${package.name}-gecko@june07.com`
        }
    }
    firefoxManifest.permissions = firefoxManifest.permissions.filter(permission => permission !== 'debugger')
    firefoxManifest.background = {
        scripts: ["src/background.js"],
        type: "module"
    }
    fs.writeFile(firefoxManifestPath, JSON.stringify(firefoxManifest, null, 4), 'utf8', async (err) => {
        if (err) {
            console.error('Error writing Firefox manifest:', err)
            return
        }
        console.log('Firefox manifest updated successfully.')
        // Zip files
        const output = fs.createWriteStream(`${messages.appName.message}-firefox-${firefoxManifest.version}.zip`)
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        })

        output.on('close', () => {
            console.log('Zip file created successfully.')
        })

        archive.on('error', (err) => {
            console.error('Error creating zip file:', err)
        })

        archive.pipe(output)
        archive.directory('./src', 'src')
        archive.directory('./icon', 'icon')
        archive.file(firefoxManifestPath, { name: 'manifest.json' })
        archive.directory('./_locales', '_locales')

        console.log(firefoxManifestPath)
        await archive.finalize()
        fs.rmSync(firefoxManifestPath)
    })
}

// Read the manifest file
fs.readFile(originalManifestPath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading manifest file:', err)
        return
    }

    // Parse JSON
    let manifest
    try {
        manifest = JSON.parse(data)
    } catch (error) {
        console.error('Error parsing manifest JSON:', error)
        return
    }

    manifest.version = package.version

    writeChromeManifest(manifest)
    writeFirefoxManifest(manifest)
})