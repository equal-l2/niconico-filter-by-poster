let loaded = false
document.addEventListener('DOMContentLoaded', () => { loaded = true })

import('./utils.js').then(utils => {
  // generate filter for the uri specified via form
  function generateFilter () {
    const mesg = document.getElementById('gen-mesg')
    const form = document.getElementById('uri')
    const link = form.value
    utils.generateFilterFromURL(link).then(([vid, filter, err]) => {
      if (err === null) {
        document.getElementById('filters').value += '\n' + formatFilter(filter)
        mesg.innerText = `Generated for ${vid}`
      } else {
        mesg.innerText = err
      }
    })
  }

  // format filter object to string
  function formatFilter (filt) {
    if (filt.user) {
      return `user:${filt.user}`
    } else if (filt.chan) {
      return `chan:${filt.chan}`
    } else {
      return ''
    }
  }

  // parse form string into array of filter object
  function parseFilters (str) {
    const lines = str.split('\n')
    const res = {
      filters: [],
      errorLine: 0
    }
    for (const [i, l] of lines.entries()) {
      const s = l.trim()
      if (s.length === 0) continue

      const entry = s.match(/(user|chan):(\d+)/)
      if (entry?.length === 3) {
        const userId = entry[1] === 'user' ? entry[2] : ''
        const chanId = entry[1] === 'chan' ? entry[2] : ''
        res.filters.push({
          user: userId,
          chan: chanId
        })
      } else {
        res.errorLine = i + 1
        break
      }
    }

    res.filters = utils.uniqFilters(res.filters)
    return res
  }

  function saveOptions () {
    const text = document.getElementById('filters').value
    const parsed = parseFilters(text)
    if (parsed.errorLine === 0) {
      browser.storage.sync.set({
        filters: parsed.filters
      })
      document.getElementById('mesg').innerText = 'Saved!'
      restoreOptions()
    } else {
      document.getElementById(
        'mesg'
      ).innerText = `Error on line ${parsed.errorLine}`
    }
  }

  function restoreOptions () {
    browser.storage.sync.get('filters').then((res) => {
      if (res.filters) {
        const str = res.filters.map((f) => formatFilter(f)).join('\n')
        document.getElementById('filters').value = str
      }
    })
  }

  if (loaded) {
    restoreOptions()
  } else {
    document.addEventListener('DOMContentLoaded', restoreOptions)
  }

  document.getElementById('apply').addEventListener('click', saveOptions)
  document.getElementById('generate').addEventListener('click', generateFilter)
})
