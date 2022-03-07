// Put all the javascript code here, that you want to execute after page load.
let filters

// filter all cards
function filterAll () {
  const cards = document.getElementsByClassName('NC-Card')
  for (const c of cards) {
    filterCard(c)
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

// find ids in filters
function inFilters (ids) {
  for (const f of filters) {
    if (
      (ids.user !== undefined && ids.user === f.user) ||
      (ids.chan !== undefined && ids.chan === f.chan)
    ) {
      return true
    }
  }
  return false
}

// add filter effect to the specified card
function filterCard (card) {
  const id = getId(card)
  if (id === '') return
  getPoster(id).then((ids) => {
    if (inFilters(ids)) {
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
  })
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
  try {
    const res = await fetch(uri)
    const text = await res.text()
    const xml = new window.DOMParser().parseFromString(text, 'text/xml')
    const userId = xml.getElementsByTagName('user_id')[0]?.textContent
    const chanId = xml.getElementsByTagName('ch_id')[0]?.textContent
    return {
      user: userId,
      chan: chanId
    }
  } catch (e) {
    console.log(e)
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
