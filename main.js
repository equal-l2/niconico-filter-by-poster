// Put all the javascript code here, that you want to execute after page load.
let filters;

// filter all cards
function filterAll() {
  const cards = document.getElementsByClassName("NC-Card");
  for (const c of cards) {
    filterCard(c);
  }
}

// filter newly-added cards
function run(muts) {
  for (const m of muts) {
    const nodes = m.addedNodes;
    if (nodes.length > 0) {
      filterCard(nodes[0]);
    }
  }
}

// find ids in filters
function inFilters(ids) {
  for (const f of filters) {
    if (
      (ids.user !== undefined && ids.user === f.user) ||
      (ids.chan !== undefined && ids.chan === f.chan)
    ) {
      return true;
    }
  }
  return false;
}

// add filter effect to the specified card
function filterCard(card) {
  let id = getId(card);
  if (id === "") return;
  getPoster(id).then((ids) => {
    if (inFilters(ids)) {
      // set title of card
      {
        const title = card.getElementsByClassName("NC-CardTitle")[0];
        if (title?.getElementsByClassName("NNFBP-Title").length === 0) {
          const original = `${title.innerText}`;
          title.innerText = "";
          const span = document.createElement("span");
          span.innerText = "Filtered";
          span.title = original;
          span.classList.add("NNFBP-Title");
          title.appendChild(span);
        }
      }

      // add effect to thumbnail
      {
        const thumb = card.getElementsByClassName("NC-Card-media")[0];
        thumb?.classList.add("NNFBP-blur");
      }
    }
  });
}

// get id of the card
function getId(card) {
  const link = card.getElementsByClassName("NC-Link")[0];
  const matches = link.href.match(/(?:sm|so)\d*/);
  if (matches?.length === 1) {
    return matches[0];
  } else {
    console.log("invalid uri:", link.href);
    return "";
  }
}

// get poster of the movie
async function getPoster(id) {
  let uri = `https://ext.nicovideo.jp/api/getthumbinfo/${id}`;
  try {
    let res = await fetch(uri);
    let text = await res.text();
    let xml = new window.DOMParser().parseFromString(text, "text/xml");
    let userId = xml.getElementsByTagName("user_id")[0]?.textContent;
    let chanId = xml.getElementsByTagName("ch_id")[0]?.textContent;
    return {
      user: userId,
      chan: chanId,
    };
  } catch (e) {
    console.log(e);
  }
}

browser.storage.sync
  .get("filters")
  .then((res) => {
    filters = res.filters;
    if (filters === undefined) {
      filters = [];
    }

    const observer = new MutationObserver(run);

    const rows = document.getElementsByClassName("RankingMatrixVideosRow");
    for (const row of rows) {
      observer.observe(row, { childList: true });
    }

    // remove ads
    const adRows = document.getElementsByClassName("RankingMatrixNicoadsRow");
    for (const row of adRows) {
      row.remove();
    }

    filterAll();

    browser.storage.onChanged.addListener((changes, area) => {
      console.log(changes, area)
      if (area === "sync" && changes.filters !== undefined) {
        browser.storage.sync
          .get("filters")
          .then((res) => {
            filters = res.filters;
            filterAll();
          })
      }
    });

    console.log("NNFBP enabled");
  })
  .catch((e) => {
    console.log("NNFBP failed to load filter: ", e);
  });
