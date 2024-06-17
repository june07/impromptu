(async function (settings) {
    settings.defaultSettings = {
        whitelist: ['chatgpt.com'],
        fuse: {
            options: {
                includeScore: true,
                useExtendedSearch: true,
                keys: ['title', 'string']
            }
        },
        token: undefined
    }
    settings.userSettings = async () => await chrome.storage.local.get('userSettings')
    settings.get = async function () {
        const { userSettings } = await settings.userSettings()
        const updatedSettings = {
            ...settings.defaultSettings,
            ...userSettings,
        }
        return updatedSettings
    }
    settings.set = async (update) => {
        const { userSettings } = await settings.userSettings()
        const updatedSettings = {
            ...userSettings,
            ...update,
        }
        await chrome.storage.local.set({ userSettings: updatedSettings })
        Object.entries(await settings.get()).forEach((kv) => settings[kv[0]] = kv[1])
    }
    Object.entries(await settings.get()).forEach((kv) => settings[kv[0]] = kv[1])
})(typeof module !== 'undefined' && module.exports ? module.exports : (self.settings = self.settings || {}))