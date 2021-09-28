// Put all the javascript code here, that you want to execute after page load.
let filters;

function runFirst() {
  const cards = document.getElementsByClassName("NC-Card");
  for (const c of cards) {
    filterCard(c);
  }
}

function run(muts) {
  for (const m of muts) {
    const nodes = m.addedNodes;
    if (nodes.length > 0) {
      filterCard(nodes[0]);
    }
  }
}

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

function filterCard(card) {
  let id = getId(card);
  if (id === "") return;
  getPoster(id).then((ids) => {
    if (inFilters(ids)) {
      setTitle(card);
      setThumb(card);
    }
  });
}

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

function setTitle(card) {
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

function setThumb(card) {
  const thumb = card.getElementsByClassName("NC-Card-media")[0];
  thumb?.classList.add("NNFBP-blur");
}

window.onload = () => {
  browser.storage.sync.get("filters").then((res) => {
    filters = res.filters;

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

    runFirst();
  });
};
