/* 

🌐 Web Crawler Project – How it Works

This project crawls websites starting from a given base URL and collects internal links (same domain).
It ignores external links and counts how many times each internal page is linked.

----------------------------------------
1. ✅ Normalize the URL
----------------------------------------

The goal is to make URLs consistent by:
- Removing protocol (http/https)
- Removing trailing slashes
- Making everything lowercase

Examples:
https://google.com     => google.com  
http://google.com     => google.com  
https://google.com/   => google.com  
https://GOOGLE.com    => google.com  

Why? 
👉 So we can treat all versions of the same page as one and avoid crawling duplicates.

----------------------------------------
2. 🔍 Get URLs from HTML
----------------------------------------

There are 2 types of URLs in a webpage:
1. Absolute URL: starts with http/https (e.g., https://dummyjson.com)
2. Relative URL: starts with `/` (e.g., /users)

To extract them:
- Use JSDOM to parse HTML
- Find all `<a>` tags
- Convert relative URLs to absolute using the baseURL

----------------------------------------
3. 🕷️ How the Web Crawler Works
----------------------------------------

The crawler works recursively:

Step-by-step:

✅ 1. Start with the baseURL

✅ 2. For each page:
   - Check if the hostname of the current URL matches the base URL
     ❌ If not, return `pages` (skip external links)

✅ 3. Normalize the current URL

✅ 4. Check if the page is already crawled (in `pages` object)
   - If yes, increment the counter and return
   - If no, add to `pages` with count = 1

✅ 5. Fetch the HTML of the current page

✅ 6. If content is HTML, parse it to get URLs from links

✅ 7. For each extracted URL:
   - Recursively call `crawlPage()` again

✅ 8. Continue until all internal links are visited

----------------------------------------
4. 🧠 Example Scenario

Base URL:
https://example.com

Let's say the crawler visits this:
https://example.com/a
  → has link to `/b` (which becomes https://example.com/b)

Then visits:
https://example.com/b
  → has link to `/c`

Then visits:
https://example.com/c

All pages are on the same domain, so they are crawled.

BUT if it encounters:
https://xyz.com
👎 Hostname is different → Skip the page

So it only stays inside the same website (same hostname) and keeps following internal links.

----------------------------------------
5. 🔁 Output

In the end, the `pages` object looks like:
{
  "example.com": 1,
  "example.com/a": 1,
  "example.com/b": 2,
  "example.com/c": 1
}

This tells you:
- Which pages were visited
- How many times each page was linked

*/

const { JSDOM } = require("jsdom");

async function crawlPage(baseURL, currentURL, pages) {
  const baseURLObj = new URL(baseURL);
  const currentURLObj = new URL(currentURL);

  // Skip external links
  if (baseURLObj.hostname !== currentURLObj.hostname) {
    return pages;
  }

  const normalizeCurrentURL = normalizeURL(currentURL);
  
  // Fixed: Check if page exists first, then increment or initialize
  if (pages[normalizeCurrentURL]) {
    pages[normalizeCurrentURL]++;
    return pages;
  }
  pages[normalizeCurrentURL] = 1;
  
  console.log(`Actively Crawling ${currentURL}`);

  try {
    const response = await fetch(currentURL);

    if (response.status > 399) {
      console.log(`Error in fetch with status code ${response.status}`);
      return pages; // Fixed: Return pages instead of undefined
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      console.log(`Non HTML Response: content type ${contentType}`);
      return pages;
    }

    const htmlBody = await response.text();
    const nextURLs = getURLSfromHTML(htmlBody, baseURL); // Fixed: typo in variable name

    for (const nextURL of nextURLs) {
      pages = await crawlPage(baseURL, nextURL, pages);
    }
  } catch (error) {
    console.log(`Error crawling ${currentURL}: ${error.message}`);
  }

  return pages;
}

function getURLSfromHTML(htmlBody, baseURL) {
  const urls = [];
  const dom = new JSDOM(htmlBody);
  const linkElements = dom.window.document.querySelectorAll("a");

  for (const linkElement of linkElements) {
    if (linkElement.href.slice(0, 1) === "/") {
      // Relative URL
      try {
        const urlObj = new URL(`${baseURL}${linkElement.href}`);
        urls.push(urlObj.href);
      } catch (error) {
        console.log(`Error parsing relative URL ${linkElement.href}: ${error.message}`);
      }
    } else {
      // Absolute URL
      try {
        const urlObj = new URL(linkElement.href);
        urls.push(urlObj.href);
      } catch (error) {
        console.log(`Error parsing absolute URL ${linkElement.href}: ${error.message}`);
      }
    }
  }
  return urls;
}

function normalizeURL(urlString) {
  const urlObj = new URL(urlString);
  const hostPath = `${urlObj.hostname}${urlObj.pathname}`;

  if (hostPath.length > 0 && hostPath.slice(-1) === "/") {
    return hostPath.slice(0, -1); 
  }

  return hostPath;
}

module.exports = {
  normalizeURL,
  getURLSfromHTML,
  crawlPage
};