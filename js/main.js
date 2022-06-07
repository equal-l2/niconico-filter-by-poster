// Put all the javascript code here, that you want to execute after page load.
'use strict'

class Poster {
  constructor (name, id) {
    this.name = name
    this.id = id
  }
}

class UserOrChan {
  #user
  #chan

  constructor (user, chan) {
    this.#user = user
    this.#chan = chan
  }

  static user (poster) {
    return new UserOrChan(poster, null)
  }

  static chan (poster) {
    return new UserOrChan(null, poster)
  }

  get value () {
    if (this.isUser()) {
      return this.#user
    } else if (this.isChan()) {
      return this.#chan
    } else {
      return null
    }
  }

  isUser () {
    return this.#user !== null && this.#chan === null
  }

  isChan () {
    return this.#user === null && this.#chan !== null
  }
}

let filters = []

// cache for card IDs whose poster is once fetched
const postersForIds = new Map()

// filter all cards
function filterAll () {
  const cards = document.querySelectorAll('.NC-Card:not(.NNFBP-Blocked)')
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
      (poster.isUser() && poster.value.id === f.user) ||
      (poster.isChan() && poster.value.id === f.chan)
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
    // set title of card, and add tooltips indicating the original title
    {
      const title = card.getElementsByClassName('NC-CardTitle')[0]

      const original = `${title.innerText}`
      title.innerText = 'Filtered'
      const titleTooltip = `${original}\n(${poster.value.name})`

      for (const a of card.getElementsByTagName('a')) {
        a.title = titleTooltip
      }
    }

    card.classList.add('NNFBP-Blocked')
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

  if (userId) {
    const userNickname = xml.getElementsByTagName('user_nickname')[0]?.textContent
    const poster = new Poster(userNickname, userId)
    return UserOrChan.user(poster)
  } else if (chanId) {
    const channelName = xml.getElementsByTagName('ch_name')[0]?.textContent
    const poster = new Poster(channelName, chanId)
    return UserOrChan.chan(poster)
  } else {
    return null
  }
}

browser.storage.sync
  .get('filters')
  .then((res) => {
    console.log('NNFBP filters loaded')
    if (res.filters !== undefined) {
      filters = res.filters
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
