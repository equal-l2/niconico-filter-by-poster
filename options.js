function generateFilter() {
  const link = document.getElementById("uri").value;
  const match = link.match(/(?:sm|so)\d*/);
  if (match?.length === 1) {
    const uri = `https://ext.nicovideo.jp/api/getthumbinfo/${match[0]}`;
    console.log(uri);
    fetch(uri)
      .then((res) => res.text())
      .then((text) => {
        console.log(text);
        const xml = new window.DOMParser().parseFromString(text, "text/xml");
        const userId = xml.getElementsByTagName("user_id")[0]?.textContent;
        const chanId = xml.getElementsByTagName("ch_id")[0]?.textContent;
        const filter = {
          user: userId,
          chan: chanId,
        };
        document
          .getElementById("filters")
          .value += ("\n" + formatFilter(filter));
      })
      .catch((e) => {
        console.log(e);
      });
  }
}

function formatFilter(filt) {
  if (filt.user) {
    return `user:${filt.user}`;
  } else if (filt.chan) {
    return `chan:${filt.chan}`;
  } else {
    return "";
  }
}

function parseFilters(str) {
  const lines = str.split("\n");
  let res = {
    filters: [],
    errorLine: 0,
  };
  for (const [i, l] of lines.entries()) {
    const s = l.trim();
    if (s.length === 0) continue;

    const entry = s.match(/(user|chan):(\d+)/);
    if (entry?.length === 3) {
      const userId = entry[1] === "user" ? entry[2] : "";
      const chanId = entry[1] === "chan" ? entry[2] : "";
      res.filters.push({
        user: userId,
        chan: chanId,
      });
    } else {
      res.errorLine = i + 1;
      break;
    }
  }
  return res;
}

function saveOptions() {
  const text = document.getElementById("filters").value;
  const parsed = parseFilters(text);
  if (parsed.errorLine === 0) {
    browser.storage.sync.set({
      filters: parsed.filters,
    });
    document.getElementById("mesg").innerText = "Saved!";
  } else {
    document.getElementById(
      "mesg"
    ).innerText = `Error on line ${parsed.errorLine}`;
  }
}

function restoreOptions() {
  browser.storage.sync.get("filters").then((res) => {
    const str = res.filters.map((f) => formatFilter(f)).join("\n");
    document.getElementById("filters").value = str;
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("apply").addEventListener("click", saveOptions);
document.getElementById("generate").addEventListener("click", generateFilter);
