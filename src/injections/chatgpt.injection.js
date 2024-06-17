(async function (injections) {
    injections.chatgptcom = async (prompts, ui) => {
        const { token, module } = ui

        console.log('injected chatgpt helper code')

        async function updatePrompts() {
            await async.until(
                (callback) => {
                    callback(null, Array.from(document.querySelectorAll('.group.relative')).filter(p => p.querySelector('a')?.href).length > 0)
                },
                (next) => setTimeout(next)
            )
            const scrapedPrompts = Array.from(document.querySelectorAll('.group.relative')).filter(p => p.querySelector('a')?.href).map(p => ({ title: p.innerText, href: p.querySelector('a').href }))
            const newPrompts = await Promise.all(scrapedPrompts
                .filter(sp => !prompts.find(p => p.id === sp.href.split('/').pop()))
                .map(p => {
                    const conversationId = p.href.split('/').pop()
                    const href = `https://chatgpt.com/backend-api/conversation/${conversationId}`

                    return fetch(href, {
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    }).then(res => res.json()).then(json => ({
                        id: conversationId,
                        timestamp: json.update_time * 1000,
                        module,
                        title: json.title || conversationId,
                        href: p.href,
                        string: Object.values(json.mapping).filter(v => v.message?.create_time).sort((a, b) => a.message.create_time > b.message.create_time ? -1 : 0).pop().message.content.parts
                    }))
                }))
            prompts = Array.from(new Set([...prompts, ...newPrompts]))
            chrome.runtime.sendMessage({ command: 'add', prompts })
        }
        document.addEventListener('keyup', (event) => {
            const searchTextarea = document.getElementById('search-textarea')
            const promptTextarea = document.getElementById('prompt-textarea')
            let filteredPrompts = [...prompts]

            function renderPromptList() {
                const promptList = document.getElementById('prompt-list')
                promptList.innerHTML = ''

                filteredPrompts.forEach(prompt => {
                    const li = document.createElement('li')
                    const title = document.createElement('div')
                    const buttonContainer = document.createElement('div')
                    const submitButton = document.createElement('div')
                    const gptIcon = document.createElement('div')

                    title.textContent = prompt.title
                    title.style.flexGrow = '1'
                    title.style.overflow = 'hidden'
                    title.addEventListener('mouseover', () => {
                        li.style.backgroundColor = 'white'
                        li.style.color = 'black'
                    })
                    title.addEventListener('mouseout', () => {
                        li.style.backgroundColor = 'black'
                        li.style.color = 'white'
                    })
                    title.onclick = () => {
                        promptTextarea.value = prompt.string
                    }
                    li.style.color = 'white'
                    li.style.flexGrow = '0'
                    li.style.margin = '0'
                    li.style.display = 'flex'
                    li.style.alignItems = 'center'
                    li.style.justifyContent = 'space-between'
                    li.style.whiteSpace = 'nowrap'
                    li.style.textOverflow = 'ellipsis'
                    li.style.cursor = 'pointer'

                    submitButton.innerHTML = '<button class="ml-8 flex h-4 w-4 items-center justify-center rounded-full bg-white text-black transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:outline-black disabled:bg-[#D7D7D7] disabled:text-[#f4f4f4] disabled:hover:opacity-100 dark:bg-white dark:text-black dark:focus-visible:outline-white disabled:dark:bg-token-text-quaternary dark:disabled:text-token-main-surface-secondary"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 32 32"><path fill="currentColor" fill-rule="evenodd" d="M15.192 8.906a1.143 1.143 0 0 1 1.616 0l5.143 5.143a1.143 1.143 0 0 1-1.616 1.616l-3.192-3.192v9.813a1.143 1.143 0 0 1-2.286 0v-9.813l-3.192 3.192a1.143 1.143 0 1 1-1.616-1.616z" clip-rule="evenodd"></path></svg></button>'
                    submitButton.onclick = () => {
                        promptTextarea.value = prompt.string
                        promptTextarea.click()
                        promptList.style.display = 'none'
                    }

                    buttonContainer.appendChild(submitButton.firstChild)

                    gptIcon.style.marginRight = '8px'
                    gptIcon.innerHTML = `<img src="${ui.favicons[prompt.module]}" alt="GPT" width="16" height="16" style="max-width: unset" />`

                    li.appendChild(gptIcon)
                    li.appendChild(title)
                    li.appendChild(buttonContainer)
                    promptList.appendChild(li)
                })
            }

            if (event.key === '/') {
                // render lightweight html 5 list of stored prompts. Each item should have an edit button and an enter button. The edit button will fill in the textarea with the list item value and the enter button will do the same but also navigate to the prompt.
                if (promptTextarea && !searchTextarea) {
                    promptTextarea.value = ''
                    // Create container for prompts
                    const promptContainer = document.createElement('div')
                    promptContainer.style.overflowX = 'hidden'
                    promptContainer.style.maxWidth = '-webkit-fill-available'
                    promptContainer.style.borderRadius = '16px'
                    promptContainer.style.background = 'black'
                    promptContainer.style.position = 'absolute'
                    promptContainer.style.bottom = '60px'
                    promptContainer.style.left = '0'
                    promptContainer.style.opacity = '0.9'
                    promptContainer.innerHTML = `
                            <div id="prompt-list">
                                <ul style="padding: 0; margin: 0;"></ul>
                            </div>
                            <div class="branding-container">
                                <span style="color: white; margin-right: 8px">im<span style="font-weight: bold">prompt</span>u</span>
                                <a href="https://github.com/june07/impromptu" target="_blank" rel="noopener noreferrer">
                                <svg height="32" fill="white" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-mark-github">
                                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                                </svg>
                                </a>
                            </div>
                            <textarea id="search-textarea" tabindex="1" dir="auto" rows="1" placeholder="Search Prompts"></textarea>
                        `

                    // Insert the promptContainer after the existing textarea
                    promptTextarea.parentNode.insertBefore(promptContainer, promptTextarea)

                    renderPromptList()

                    const searchTextarea = document.getElementById('search-textarea')
                    searchTextarea.focus()
                    searchTextarea.value = ''

                    document.addEventListener('click', (event) => {
                        const isClickInsidePromptList = promptContainer.contains(event.target)
                        if (!isClickInsidePromptList) {
                            promptContainer.remove()
                        }
                    })
                }
            } else if (searchTextarea) {
                searchTextarea.value = event.target.value

                chrome.runtime.sendMessage({ command: 'search', string: event.target.value }, function (response) {
                    prompts = response?.results || []
                    renderPromptList()
                })
            }
        })
        updatePrompts()
    }
})(typeof module !== 'undefined' && module.exports ? module.exports : (self.injections = self.injections || {}))