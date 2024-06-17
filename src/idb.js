(async function (idb) {
    let cache = {}

    async function openDBConnection() {
        return new Promise((resolve, reject) => {
            // Open a connection to the IndexedDB database
            const openRequest = indexedDB.open('impromptu', 1)

            openRequest.onupgradeneeded = function (event) {
                cache.db = event.target.result

                // Create or upgrade the object store
                cache.defaultObjectStore = cache.db.createObjectStore('prompts', { keyPath: 'id' })
            }

            openRequest.onsuccess = function (event) {
                cache.db = event.target.result
                resolve()
            }

            openRequest.onerror = function (event) {
                console.log('Error opening database:', event.target.error)
                reject()
            }
        })
    }
    async function saveToIndexDb(jsonArray) {
        function update() {
            if (!jsonArray.length) return

            try {
                // Access the object store
                const transaction = cache.db.transaction(['prompts'], 'readwrite')
                cache.defaultObjectStore = transaction.objectStore('prompts')

                for (const json of jsonArray) {
                    // Get the object by its id
                    const getRequest = cache.defaultObjectStore.get(json.id)

                    getRequest.onsuccess = function (event) {
                        const existingObject = event.target.result

                        if (existingObject) {
                            const updateRequest = cache.defaultObjectStore.put({
                                ...existingObject,
                                ...json
                            })

                            updateRequest.onsuccess = function (event) {
                                // console.log('Data updated successfully:', event.target.result)
                            }

                            updateRequest.onerror = function (event) {
                                console.log('Error updating data:', event.target.error)
                            }
                        } else {
                            // Add the new object to IndexedDB
                            const addRequest = cache.defaultObjectStore.add(json)

                            addRequest.onsuccess = function (event) {
                                // console.log('Data added successfully:', event.target.result)
                            }

                            addRequest.onerror = function (event) {
                                console.log('Error adding data:', event.target.error)
                            }
                        }
                    }

                    getRequest.onerror = function (event) {
                        console.log('Error getting data:', event.target.error)
                    }
                }
            } catch (error) {
                console.log(error)
            }
        }
        if (!cache.db) {
            await openDBConnection()
        }
        update()
    }
    async function read() {
        if (!cache.db) {
            await openDBConnection()
        }
        return await new Promise(resolve => {
            const transaction = cache.db.transaction(['prompts'], 'readonly')
            cache.defaultObjectStore = transaction.objectStore('prompts')
            const getRequest = cache.defaultObjectStore.getAll()
            getRequest.onsuccess = function (event) {
                cache.results = event.target.result
                resolve(event.target.result)
            }
        })
    }
    idb.prompts = async function () {
        return (await read()) || []
    }
    idb.add = async function (json) {
        saveToIndexDb(json)
    }
    idb.search = async function (string) {
        if (!cache.db) {
            await openDBConnection()
        }
        if (!cache.results) {
            read()
        }
        const fuse = new Fuse(cache.results, settings.fuse.options)
        const results = fuse.search(string)

        // use the stats somehow...

        return results?.map(r => r.item) || []
    }
})(typeof module !== 'undefined' && module.exports ? module.exports : (self.idb = self.idb || {}))