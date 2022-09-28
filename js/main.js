// Put all the javascript code here, that you want to execute after page load.
'use strict'

class NameIdPair {
  /**
   * @param {?string} name
   * @param {?string} id
   */
  constructor (name, id) {
    this.name = name
    this.id = id
  }
}

class Poster {
  #user
  #chan

  /**
   * @param {?NameIdPair} user
   * @param {?NameIdPair} chan
   */
  constructor (user, chan) {
    this.#user = user
    this.#chan = chan
  }

  /**
   * Construct an user object
   *
   * @param {NameIdPair} pair
   */
  static user (pair) {
    return new Poster(pair, null)
  }

  /**
   * Construct a chan object
   *
   * @param {NameIdPair} pair
   */
  static chan (pair) {
    return new Poster(null, pair)
  }

  get value () {
    if (this.isUser()) {
      return this.#user
    } else if (this.isChan()) {
      return this.#chan
    } else {
      // should never happen
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

/**
 * @typedef FilterEntry
 * @type {object}
 * @property {?string} user
 * @property {?string} chan
 */

/**
 * @type FilterEntry[]
 */
let filters = []

/**
 * Cache for card IDs whose poster is once fetched
 * @type {Map<string, ?Poster>}
 */
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

/**
 * Check if the poster is contained in the filters
 *
 * @param {Poster} poster
 */
function inFilters (poster) {
  for (const f of filters) {
    if (
      (poster.isUser() && poster.value?.id === f.user) ||
      (poster.isChan() && poster.value?.id === f.chan)
    ) {
      return true
    }
  }
  return false
}

/**
  * Apply filter effect to the specified card
  * @returns {Promise<void>}
  */
async function filterCard (card) {
  const id = getId(card)
  if (id === '') return

  const poster = postersForIds.get(id)
  if (poster !== undefined) {
    // poster for the card is already fetched
    await new Promise((resolve, reject) => {
      try {
        applyFilter(poster, card)
        // Produce Promise<void>
        resolve(undefined)
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
    // set the title of the card, and add a tooltip indicating the original title
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

/**
 * Get the id of the video pointed by the card
 *
 * @returns {string} the id on success, otherwise an empty string
 */
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

/**
 * Get the poster of the video
 *
 * @param {string} id
 * @returns {Promise<?Poster>} UserOrChan object on success, otherwise null
 */
async function getPoster (id) {
  const uri = `https://ext.nicovideo.jp/api/getthumbinfo/${id}`
  const res = await fetch(uri)
  const text = await res.text()
  const xml = new window.DOMParser().parseFromString(text, 'text/xml')
  const userId = xml.getElementsByTagName('user_id')[0]?.textContent
  const chanId = xml.getElementsByTagName('ch_id')[0]?.textContent

  if (userId) {
    const userNickname = xml.getElementsByTagName('user_nickname')[0]?.textContent
    const poster = new NameIdPair(userNickname, userId)
    return Poster.user(poster)
  } else if (chanId) {
    const channelName = xml.getElementsByTagName('ch_name')[0]?.textContent
    const poster = new NameIdPair(channelName, chanId)
    return Poster.chan(poster)
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
