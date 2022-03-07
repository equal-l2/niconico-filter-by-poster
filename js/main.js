// Put all the javascript code here, that you want to execute after page load.
let filters

// cache for card IDs whose poster is once fetched
const postersForIds = new Map()

// filter all cards
function filterAll () {
  const cards = document.getElementsByClassName('NC-Card')
  for (const c of cards) {
    filterCard(c).catch(err => console.error(err))
  }
}

// filter newly-added cards
function run (muts) {
  for (const m of muts) {
    const nodes = m.addedNodes
    if (nodes.length > 0) {
      filterCard(nodes[0])
    }
  }
}

// find poster in filters
function inFilters (poster) {
  for (const f of filters) {
    if (
      (poster.user !== undefined && poster.user === f.user) ||
      (poster.chan !== undefined && poster.chan === f.chan)
    ) {
      return true
    }
  }
  return false
}

// add filter effect to the specified card
async function filterCard (card) {
  const id = getId(card)
  if (id === '') return

  const poster = postersForIds.get(id)
  if (poster !== undefined) {
    // poster for the card is already fetched
    await new Promise((resolve, reject) => {
      try {
        applyFilter(poster, card)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  } else {
    // fetch poster for the card
    await getPoster(id).then(poster => {
      postersForIds.set(id, poster)
      applyFilter(poster, card)
    })
  }
}

function applyFilter (poster, card) {
  if (inFilters(poster)) {
    // set title of card
    {
      const title = card.getElementsByClassName('NC-CardTitle')[0]
      if (title?.getElementsByClassName('NNFBP-Title').length === 0) {
        const original = `${title.innerText}`
        title.innerText = ''
        const span = document.createElement('span')
        span.innerText = 'Filtered'
        span.title = original
        span.classList.add('NNFBP-Title')
        title.appendChild(span)
      }
    }

    // add effect to thumbnail
    {
      const thumb = card.getElementsByClassName('NC-Card-media')[0]
      thumb?.classList.add('NNFBP-blur')
    }
  }
}

// get id of the card
function getId (card) {
  const link = card.getElementsByClassName('NC-Link')[0]
  const matches = link.href.match(/(?:sm|so)\d*/)
  if (matches?.length === 1) {
    return matches[0]
  } else {
    console.log('invalid uri:', link.href)
    return ''
  }
}

// get poster of the movie
async function getPoster (id) {
  const uri = `https://ext.nicovideo.jp/api/getthumbinfo/${id}`
  const res = await fetch(uri)
  const text = await res.text()
  const xml = new window.DOMParser().parseFromString(text, 'text/xml')
  const userId = xml.getElementsByTagName('user_id')[0]?.textContent
  const chanId = xml.getElementsByTagName('ch_id')[0]?.textContent
  return {
    user: userId,
    chan: chanId
  }
}

browser.storage.sync
  .get('filters')
  .then((res) => {
    console.log('NNFBP filters loaded')
    filters = res.filters
    if (filters === undefined) {
      filters = []
    }

    const observer = new MutationObserver(run)

    const rows = document.getElementsByClassName('RankingMatrixVideosRow')
    for (const row of rows) {
      observer.observe(row, { childList: true })
    }

    filterAll()

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.filters?.newValue !== undefined) {
        filters = changes.filters.newValue
        console.log('NNFBP filters reloaded')
        filterAll()
      }
    })

    console.log('NNFBP enabled')
  })
  .catch((e) => {
    console.log('NNFBP failed to load filter: ', e)
  })
