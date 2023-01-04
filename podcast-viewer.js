const playerSpeedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const qrcodeIconUrl = chrome.runtime.getURL("images/qr.svg")
const topIconUrl = chrome.runtime.getURL("images/up.svg")

const PodcastHeadHtml = `
  <a class="podcast-cover-container" target="_blank">
    <img
      alt="Podcast Cover"
      class="podcast-cover"
      loading="lazy"
    />
  </a>
  <div class="podcast-info">
    <h1 class="podcast-title"></h1>
    <div class="podcast-author">
      <div class="author"></div>
      <div class="owner"></div>
    </div>
    <p class="podcast-description"></p>
    <div class="podcast-action">
      <div class="generate-qr-code">
        <img src="${qrcodeIconUrl}" alt="QR Code"/>
      </div>
      <div class="qr-code-container">
        <div class="qr-code"></div>
      </div>
    </div>
  </div>
`

const EpisodeItemHtml = `
  <div class="episode-info">
    <h1 class="episode-title"></h1>
    <div class="episode-publish-date"></div>
    <div class="player"></div>
    <p class="episode-description"></p>
  </div>
  <div class="view-more">👀 View more</div>
  <a class="episode-cover-container" target="_blank">
    <img
      alt="Episode Cover"
      class="episode-cover"
      loading="lazy"
    />
  </a>
`

const BackToTopTemplate = `
  <img src="${topIconUrl}" alt="top"/>
`

const FooterTemplate = `
  <div>Generated by <a href="https://github.com/LGiki/nice-podcast-rss" target="_blank">Nice Podcast RSS</a></div>
`

const createElement = (html, className) => {
    const element = document.createElement('div')
    if (className) {
        if (typeof className === 'string') {
            element.className = className
        } else {
            className.forEach(item => {
                element.classList.add(item)
            })
        }
    }
    element.innerHTML = html
    return element
}

const isPodcastRSS = (rssElement) => {
    return rssElement?.hasAttribute('xmlns:itunes') && rssElement?.getAttribute('xmlns:itunes') === 'http://www.itunes.com/dtds/podcast-1.0.dtd'
}

const parseEpisodeItem = (itemElement) => {
    const item = {}
    Array.from(itemElement.children).map((element, index) => {
        switch (element.tagName) {
            case 'title':
            case 'guid':
            case 'link':
            case 'dc:creator':
            case 'pubDate':
            case 'author':
                item[element.tagName] = element.firstChild ? element.firstChild.wholeText : ''
                break
            case 'description':
                item['description'] = element.firstChild ? element.firstChild.wholeText.replaceAll('\n', '<br/>') : ''
                break
            case 'itunes:episode':
            case 'itunes:subtitle':
            case 'itunes:explicit':
            case 'itunes:season':
            case 'itunes:episodeType':
            case 'itunes:duration':
            case 'itunes:author':
            case 'itunes:title':
            case 'itunes:order':
            case 'itunes:keywords':
            case 'content:encoded':
            case 'podcast:season':
            case 'podcast:episode':
            case 'fireside:playerURL':
            case 'fireside:playerEmbedCode':
                const [prefix, key] = element.tagName.split(':')
                if (!item[prefix]) {
                    item[prefix] = {}
                }
                item[prefix][key] = element.firstChild ? element.firstChild.wholeText : ''
                break
            case 'itunes:summary':
                if (!item['itunes']) {
                    item['itunes'] = {}
                }
                item['itunes']['summary'] = element.firstChild ? element.firstChild.wholeText.replaceAll('\n', '<br/>') : ''
                break
            case 'itunes:image':
                if (!item['itunes']) {
                    item['itunes'] = {}
                }
                item['itunes']['image'] = element.getAttribute('href')
                break
            case 'enclosure':
                if (!item['enclosure']) {
                    item['enclosure'] = {}
                }
                item['enclosure']['url'] = element.getAttribute('url')
                item['enclosure']['type'] = element.getAttribute('type')
                item['enclosure']['length'] = element.getAttribute('length')
                break
            default:
                // console.log(`[Nice Podcast RSS] Unknown episode item key: ${element.tagName}`)
                break
        }
    })
    return item
}

const parsePodcastRSS = (rssElement) => {
    const podcast = {};
    Array.from(rssElement.children[0].children).map((element, index) => {
        switch (element.tagName) {
            case 'copyright':
            case 'title':
            case 'link':
            case 'language':
            case 'generator':
            case 'lastBuildDate':
            case 'author':
            case 'pubDate':
                podcast[element.tagName] = element.firstChild ? element.firstChild.wholeText : ''
                break
            case 'description':
                podcast['description'] = element.firstChild ? element.firstChild.wholeText.replaceAll('\n', '<br/>') : ''
                break
            case 'itunes:title':
            case 'itunes:subtitle':
            case 'itunes:author':
            case 'itunes:type':
            case 'itunes:explicit':
            case 'itunes:keywords':
            case 'itunes:new-feed-url':
            case 'fireside:hostname':
            case 'fireside:genDate':
            case 'podcast:guid':
                const [prefix, key] = element.tagName.split(':')
                if (!podcast[prefix]) {
                    podcast[prefix] = {}
                }
                podcast[prefix][key] = element.firstChild ? element.firstChild.wholeText : ''
                break
            case 'itunes:summary':
                if (!podcast['itunes']) {
                    podcast['itunes'] = {}
                }
                podcast['itunes']['summary'] = element.firstChild ? element.firstChild.wholeText.replaceAll('\n', '<br/>') : ''
                break
            case 'itunes:image':
                if (!podcast['itunes']) {
                    podcast['itunes'] = {}
                }
                podcast['itunes']['image'] = element.getAttribute('href')
                break
            case 'itunes:owner':
                const itunesOwner = {}
                Array.from(element.children).map(subElement => {
                    const [_, key] = subElement.tagName.split(':')
                    itunesOwner[key] = subElement.firstChild ? subElement.firstChild.wholeText : ''
                })
                if (!podcast['itunes']) {
                    podcast['itunes'] = {}
                }
                podcast['itunes']['owner'] = itunesOwner
                break
            case 'atom:link':
                if (!podcast['atom']) {
                    podcast['atom'] = {}
                }
                podcast['atom']['href'] = element.getAttribute('href')
                podcast['atom']['type'] = element.getAttribute('type')
                podcast['atom']['rel'] = element.getAttribute('rel')
                break
            case 'itunes:category':
                if (!podcast['itunes']) {
                    podcast['itunes'] = {}
                }
                if (!podcast['itunes']['category']) {
                    podcast['itunes']['category'] = []
                }
                // TODO category
                break
            case 'item':
                if (!podcast['items']) {
                    podcast['items'] = []
                }
                podcast['items'].push(parseEpisodeItem(element))
                break
            case 'image':
                if (!podcast['image']) {
                    podcast['image'] = {}
                }
                Array.from(element.children).forEach(imageChild => {
                    switch (imageChild.tagName) {
                        case 'url':
                        case 'title':
                        case 'link':
                            podcast['image'][imageChild.tagName] = imageChild.firstChild ? imageChild.firstChild.wholeText : ''
                            break
                        default:
                            console.log(`[Nice Podcast RSS] Unknown podcast image key: ${imageChild.tagName}`)
                            break
                    }
                })
                break
            default:
                // console.log(`[Nice Podcast RSS] Unknown podcast key: ${element.tagName}`)
                break
        }
    });
    return podcast;
}

const generatePodcastHead = (container, podcast) => {
    const podcastHeadTemplate = createElement(PodcastHeadHtml, 'item-box podcast-info-container')

    const podcastCoverContainer = podcastHeadTemplate.querySelector('.podcast-cover-container')
    const podcastCover = podcastHeadTemplate.querySelector('.podcast-cover')
    const podcastTitle = podcastHeadTemplate.querySelector('.podcast-title')
    const podcastDescription = podcastHeadTemplate.querySelector('.podcast-description')
    const podcastAuthor = podcastHeadTemplate.querySelector('.podcast-author')
    const generateQrCode = podcastHeadTemplate.querySelector('.generate-qr-code')
    const qrCode = podcastHeadTemplate.querySelector('.qr-code')
    const qrCodeContainer = podcastHeadTemplate.querySelector('.qr-code-container')

    generateQrCode.addEventListener('mouseover', () => {
        if (qrCode.children.length === 0) {
            new QRCode(qrCode, {
                text: window.location.href,
                colorDark: '#332c2b',
                colorLight: '#fff'
            })
        }
        qrCodeContainer.style.display = 'block'
    })

    generateQrCode.addEventListener('mouseout', () => {
        qrCodeContainer.style.display = 'none'
    })

    if (podcast.itunes && podcast.itunes.image) {
        podcastCoverContainer.href = podcast.itunes.image
        podcastCover.src = podcast.itunes.image
    }

    podcastCover.title = podcast.title || ''
    podcastCover.alt = podcast.title || ''
    podcastTitle.innerText = podcast.title || ''

    if (podcast.description) {
        podcastDescription.innerHTML = podcast.description
    } else if (podcast.itunes && podcast.itunes.summary) {
        podcastDescription.innerHTML = podcast.itunes.summary
    }

    if (podcast.itunes.author) {
        podcastAuthor.innerText = podcast.itunes.author
    } else if (podcast.author) {
        podcastAuthor.innerText = podcast.author
    }

    container.appendChild(podcastHeadTemplate)
}

const generateEpisodeItems = (container, podcast) => {
    const fragment = document.createDocumentFragment()
    const episodeItemTemplate = createElement(EpisodeItemHtml, 'item-box episode-item-container')
    podcast.items.forEach(item => {
        const episodeItem = episodeItemTemplate.cloneNode(true)
        const episodeInfo = episodeItem.querySelector('.episode-info')
        const episodeCoverContainer = episodeItem.querySelector('.episode-cover-container')
        const episodeCover = episodeItem.querySelector('.episode-cover')
        const episodeTitle = episodeItem.querySelector('.episode-title')
        const episodePublishDate = episodeItem.querySelector('.episode-publish-date')
        const episodeDescription = episodeItem.querySelector('.episode-description')
        const playerContainer = episodeItem.querySelector('.player')
        const viewMore = episodeItem.querySelector('.view-more')

        viewMore.addEventListener('click', () => {
            episodeInfo.style.maxHeight = 'max-content'
            viewMore.parentElement.removeChild(viewMore)
        })

        if (item.pubDate) {
            const formattedPublishDate = dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss')
            episodePublishDate.innerText = `📅 ${formattedPublishDate}`
        }

        let episodeCoverUrl = ''
        if (item.itunes && item.itunes.image) {
            episodeCoverUrl = item.itunes.image
        } else if (podcast.itunes && podcast.itunes.image) {
            episodeCoverUrl = podcast.itunes.image
        }

        episodeCoverContainer.href = episodeCoverUrl
        episodeCover.src = episodeCoverUrl

        if (item.title) {
            episodeCover.title = item.title
            episodeCover.alt = item.title
        }

        episodeTitle.innerText = item.title
        if (item.itunes && item.itunes.summary) {
            episodeDescription.innerHTML = item.itunes.summary
        } else if (item.description) {
            episodeDescription.innerHTML = item.description
        }

        new Shikwasa.Player({
            container: playerContainer,
            audio: {
                title: item.title || 'No title',
                artist: podcast.title || 'No artist',
                cover: episodeCoverUrl || '',
                src: item.enclosure
                    ? (item.enclosure.url || '')
                    : '',
            },
            speedOptions: playerSpeedOptions,
            download: true,
            fixed: {
                type: 'static'
            }
        })

        fragment.appendChild(episodeItem)
    })
    container.appendChild(fragment)
}

const generateBackToTopButton = (container) => {
    const backToTop = createElement(BackToTopTemplate, 'back-to-top')
    backToTop.title = 'Back to top'
    window.addEventListener('scroll', () => {
        if (document.body.scrollTop > window.innerHeight || document.documentElement.scrollTop > window.innerHeight) {
            backToTop.style.visibility = 'visible';
            backToTop.style.opacity = '1';
        } else {
            backToTop.style.visibility = 'hidden';
            backToTop.style.opacity = '0';
        }
    })
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
    container.appendChild(backToTop)
}

const generateFooter = (container) => {
    const footer = createElement(FooterTemplate, 'footer')
    container.appendChild(footer)
}

const generatePodcastPage = (podcast) => {
    document.title = podcast.title
    const containerDiv = document.createElement('div')
    containerDiv.className = 'container'
    generatePodcastHead(containerDiv, podcast)
    generateEpisodeItems(containerDiv, podcast)
    generateBackToTopButton(containerDiv)
    generateFooter(containerDiv)
    document.body.appendChild(containerDiv)
}

const printExtensionInfo = () => {
    console.log(
        '%c✨%c Nice Podcast RSS v1.0.0.2 %c https://github.com/LGiki/nice-podcast-rss',
        'background-color:#bfd8bd;padding:4px;border-radius:4px 0 0 4px;',
        'background-color:#77bfa3;padding:4px;color:#fff;border-radius:0 4px 4px 0;',
        ''
    )
}

printExtensionInfo()

document.addEventListener('readystatechange', () => {
    if (document.body.firstChild.tagName.toLowerCase() === 'pre') {
        const preElement = document.body.firstChild;
        const rssParsed = new window.DOMParser().parseFromString(preElement.textContent, 'text/xml')
        if (rssParsed.children.length !== 0) {
            const rssElement = rssParsed.children[0]
            if (isPodcastRSS(rssElement)) {
                preElement?.parentElement?.removeChild(preElement)

                // Clean the body
                document.body.innerHTML = '';

                const podcast = parsePodcastRSS(rssElement)

                generatePodcastPage(podcast)
            }
        }
    } else {
        const xmlViewerElement = document.getElementById('webkit-xml-viewer-source-xml');
        const xmlViewerStyleElement = document.getElementById('xml-viewer-style');
        const rssElement = xmlViewerElement?.firstChild;
        if (isPodcastRSS(rssElement)) {
            // Remove chrome XML viewer elements
            xmlViewerElement?.parentElement?.removeChild(xmlViewerElement)
            xmlViewerStyleElement?.parentElement?.removeChild(xmlViewerStyleElement)

            // Clean the body
            document.body.innerHTML = '';

            const podcast = parsePodcastRSS(rssElement)
            console.log(podcast)

            generatePodcastPage(podcast)
        }
    }
})
