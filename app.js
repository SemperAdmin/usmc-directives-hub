const rssURL = "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=50&category=14336";
const messagesURL = "https://www.marines.mil/News/Messages/";

document.getElementById("refreshBtn").addEventListener("click", fetchMaradmins);

async function fetchMaradmins() {
  const status = document.getElementById("status");
  const results = document.getElementById("results");
  results.innerHTML = "";
  status.textContent = "Fetching data...";

  let maradmins = [];

  // Try RSS first
  try {
    const rssResponse = await fetch(rssURL);
    if (rssResponse.ok) {
      const text = await rssResponse.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const items = xml.querySelectorAll("item");

      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        const idMatch = title.match(/MARADMIN\s+\d+\/\d+/i);
        if (!idMatch) return;

        const date = new Date(pubDate);
        const now = new Date();
        const diff = (now - date) / (1000 * 60 * 60 * 24);
        if (diff <= 7) {
          maradmins.push({
            id: idMatch[0],
            title,
            link,
            pubDate: date.toISOString(),
          });
        }
      });
    } else {
      status.textContent = "RSS feed failed, switching to Messages page...";
      await fallbackScrape(messagesURL, maradmins);
    }
  } catch (err) {
    status.textContent = "RSS unavailable, using Messages page...";
    await fallbackScrape(messagesURL, maradmins);
  }

  if (maradmins.length === 0) {
    status.textContent = "No MARADMINs found in last 7 days.";
    return;
  }

  // Sort newest to oldest
  maradmins.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Render
  maradmins.forEach(m => {
    const div = document.createElement("div");
    div.classList.add("maradmin");
    div.innerHTML = `
      <h2>${m.id}: <a href="${m.link}" target="_blank">${m.title}</a></h2>
      <p><strong>Date:</strong> ${new Date(m.pubDate).toUTCString()}</p>
    `;
    results.appendChild(div);
  });

  status.textContent = `Loaded ${maradmins.length} MARADMINs.`;
}

// Fallback parser using Marines.mil/News/Messages HTML
async function fallbackScrape(url, arr) {
  try {
    const CORS_PROXY = "https://api.allorigins.win/raw?url=";
    const response = await fetch(CORS_PROXY + encodeURIComponent(RSS_URL));
    if (!res.ok) return;
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const items = doc.querySelectorAll(".message-listing a");
    const now = new Date();

    items.forEach(a => {
      const title = a.textContent.trim();
      const link = "https://www.marines.mil" + a.getAttribute("href");
      const idMatch = title.match(/MARADMIN\s+\d+\/\d+/i);
      if (!idMatch) return;
      const dateText = a.closest("article")?.querySelector("time")?.getAttribute("datetime") || "";
      const date = dateText ? new Date(dateText) : now;
      const diff = (now - date) / (1000 * 60 * 60 * 24);
      if (diff <= 7) {
        arr.push({
          id: idMatch[0],
          title,
          link,
          pubDate: date.toISOString(),
        });
      }
    });
  } catch (e) {
    console.error("Fallback scrape failed", e);
  }
}
