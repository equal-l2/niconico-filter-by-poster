export async function generateFilterFromURL(url) {
  let ret = [null, null, null] // [vid, filter, err]
  const match = url.match(/(?:sm|so)\d*/);
  if (match?.length === 1) {
    const vid = match[0];
    ret[0] = vid;
    const api = `https://ext.nicovideo.jp/api/getthumbinfo/${vid}`;
    try {
      const res = await fetch(api)
      const text = await res.text()

      const xml = new window.DOMParser().parseFromString(text, "text/xml");
      const userId = xml.getElementsByTagName("user_id")[0]?.textContent;
      const chanId = xml.getElementsByTagName("ch_id")[0]?.textContent;
      const filter = {
        user: userId,
        chan: chanId,
      };
      ret[1] = filter;
    } catch (e) {
        ret[2] = `API Error: ${e}`;
    }
  } else {
    ret[2] = "This URI is not suitable";
  }
  return ret;
}

export function uniqFilters(filters) {
  filters.sort((a, b) => {
    if (a.chan !== undefined) {
      // a == "chan:*"
      if (b.chan !== undefined) {
        // b == "chan:*"
        return a.chan - b.chan;
      } else {
        // b == "user:*"
        return -1;
      }
    } else {
      // a == "user:*"
      if (b.user !== undefined) {
        // b == "user:*"
        return a.user - b.user;
      } else {
        // b == "chan:*"
        return 1;
      }
    }
  });

  for (let i = 0; i < filters.length - 1; i++) {
    while (true) {
      let a = filters[i];
      let b = filters[i + 1];
      if (a?.user === b?.user && a?.chan === b?.chan) {
        filters.splice(i + 1, 1);
      } else {
        break;
      }
    }
  }

  return filters;
}

