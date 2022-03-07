const NNFBP_ADD = 'NNFBP-add'

function showAlert (msg) {
  browser.tabs.executeScript({ code: `alert(${msg})` })
}

browser.menus.create({
  id: NNFBP_ADD,
  title: 'Add this to NNFBP filter',
  contexts: ['link']
})

browser.menus.onClicked.addListener((info, _) => {
  if (info.menuItemId === NNFBP_ADD) {
    import('./utils.js').then(utils => {
      utils.generateFilterFromURL(info.linkUrl).then(([vid, filter, err]) => {
        if (err === null) {
          browser.storage.sync.get('filters').then((res) => {
            let filters
            if (res.filters) {
              filters = res.filters
            } else {
              filters = []
            }
            if (filters.some((elem) => filter.user === elem.user && filter.chan === elem.chan)) {
              showAlert(`Filter was not created: already exists for ${vid}`)
            } else {
              filters.push(filter)

              browser.storage.sync.set({
                filters: filters
              })

              showAlert(`Filter created for ${vid}`)
            }
          })
        } else {
          showAlert(`${err}`)
        }
      })
    })
  }
})
