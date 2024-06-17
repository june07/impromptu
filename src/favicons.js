(async function (favicons) {
    async function readPngFile(url) {
        // Fetch the image data as a blob
        const response = await fetch(url)
        const blob = await response.blob()

        // Convert the blob to a base64 string
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    }

    // function to read the favicon png file and convert it to a base64 string
    favicons.chatgptcom = await readPngFile(`${chrome.runtime.getURL('')}icon/chatgpt.png`)
    favicons.openwebui = await readPngFile(`${chrome.runtime.getURL('')}icon/openwebui.png`)
})(typeof module !== 'undefined' && module.exports ? module.exports : (self.favicons = self.favicons || {}))