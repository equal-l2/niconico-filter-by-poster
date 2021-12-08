const NNFBP_ADD = 'NNFBP-add'

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
            filters.push(filter)
            utils.uniqFilters(filters)

            browser.storage.sync.set({
              filters: filters
            })

            browser.tabs.executeScript({ code: `alert("Created for ${vid}")` })
          })
        } else {
          browser.tabs.executeScript({ code: `alert("${err}")` })
        }
      })
    })
  }
})
