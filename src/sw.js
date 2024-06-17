importScripts(
    './settings.js',
    './favicons.js',
    './injections/chatgpt.injection.js',
    './injections/openwebui.injection.js',
    './idb.js',
    '../dist/fuse.min.js',
    '../dist/async.min.js',
)

const INSTALL_URL = 'https://june07.com/impromptu-install/?utm_source=impromptu&utm_medium=chrome_extension&utm_campaign=extension_install&utm_content=1'
let cache = {
    activated: {},
    debounceTimeoutId: undefined
}
function debounce(func, delay) {
    return function (...args) {
        if (cache.debounceTimeoutId) {
            clearTimeout(cache.debounceTimeoutId)
        }
        cache.debounceTimeoutId = setTimeout(() => {
            func.apply(this, args)
            cache.debounceTimeoutId = undefined
        }, delay)
    }
}
async function activate(tab, activated) {
    if (!tab) {
        tab = await chrome.tabs.query({ active: true, lastFocusedWindow: true })[0]
    }
    // add page to whitelist of LLM pages
    const url = new URL(tab.url)
    let ui = { origin: url.origin }

    if (/:/.test(url.host)) {
        if (/open\swebui/i.test(tab.title)) {
            ui.module = 'openwebui'
        } else {
            ui.module = 'other'
        }
    } else {
        ui.module = url.hostname.replace('.', '')
    }

    settings.set({ whitelist: [...new Set([...settings.whitelist, url.host])] })

    await chrome.storage.local.set({ activated: { ...activated, [tab.id]: Date.now() } })

    if (/chatgpt/.test(ui.module) && !cache.token && !settings.token) {
        // send a message to the user to let them know then need to manually authenticate/etc.
        return
    }
    // await new Promise(resolve => setTimeout(resolve, 2000))

    if (!injections[ui.module]) {
        console.log(`no injection available yet for ${ui.module}. Help build it... https://github.com/june07/impromptu`)
        return
    }
    // inject search functionality into the page
    await Promise.all([
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["dist/async.min.js"],
        }),
        chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ["src/injections/base.css"]
        })
    ]).then(async () => {
        console.log("script injected deps in all frames")
        const prompts = await idb.prompts()
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: injections[ui.module],
            args: [
                prompts.sort((a, b) => b.timestamp - a.timestamp),
                { ...ui, token: cache.token || settings.token, favicons }
            ]
        })
    }).then(() => {
        console.log("script injected in all frames")
    })
}
function search(string) {
    return string
}
function messageHandler(request, sender, reply) {
    switch (request.command) {
        case 'search':
            idb.search(request.string).then(results => reply({ results }))
            break
        case 'add':
            idb.add(request.prompts)
            break
    }
    return true
}
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: INSTALL_URL })
        googleAnalytics.fireEvent('install')
    }
})
chrome.tabs.onActivated.addListener(async ({ tabId, _windowId }) => {
    try {
        const tab = await chrome.tabs.get(tabId)

        if (settings.whitelist.find(whitelisted => whitelisted === new URL(tab.url).host)) {
            const { activated } = await chrome.storage.local.get(['activated'])

            if (!activated[tabId]) {
                await async.until(
                    (cb) => chrome.tabs.get(tabId, (tab) => cb(null, tab?.status === 'complete')),
                    (next) => setTimeout(next)
                )
                activate(tab, activated)
            }
        }
    } catch (error) {
        console.log(error)
    }
})
chrome.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
    if (tab.status === 'complete') {
        if (settings.whitelist.find(whitelisted => whitelisted === new URL(tab.url).host)) {
            const { activated } = await chrome.storage.local.get(['activated'])

            // if the timestamp is old, debounce the activation
            if (activated?.[tabId] && activated[tabId] < Date.now() - 1000) {
                debounce(activate, 1000)(tab, activated)
            }
        }
    }
})
chrome.action.onClicked.addListener(activate)
chrome.runtime.onMessage.addListener(messageHandler)
chrome.tabs.onRemoved.addListener(async (tabId, _removeInfo) => {
    const { activated } = await chrome.storage.local.get(['activated'])

    delete activated?.[tabId]

    chrome.storage.local.set({ activated })
})
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        if (cache.token) return

        for (let header of details.requestHeaders) {
            if (header.name.toLowerCase() === 'authorization') {
                cache.token = header.value.split(' ')[1]
                settings.token = cache.token
                break
            }
        }
        return { requestHeaders: details.requestHeaders }
    },
    { urls: ["https://chatgpt.com/backend-api/*"] },
    ["requestHeaders"]
)