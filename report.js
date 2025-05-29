function printReport(pages) {
  console.log("==================");
  console.log("       REPORT");
  console.log("==================");
  
  // Check if pages object is empty or invalid
  if (!pages || typeof pages !== 'object' || Object.keys(pages).length === 0) {
    console.log("⚠️  No pages found to report");
    console.log("==================");
    console.log("     END REPORT");
    console.log("==================");
    return;
  }

  const sortedPages = sortPages(pages);
  const totalPages = sortedPages.length;
  const totalLinks = sortedPages.reduce((sum, page) => sum + page[1], 0);

  console.log(`📊 Total Pages Found: ${totalPages}`);
  console.log(`🔗 Total Links Counted: ${totalLinks}`);
  console.log("==================");

  for (const sortedPage of sortedPages) {
    const url = sortedPage[0];
    const hits = sortedPage[1];
    
    // Add proper URL formatting
    const displayURL = url.startsWith('http') ? url : `https://${url}`;
    
    // Use singular/plural properly
    const linkText = hits === 1 ? 'link' : 'links';
    console.log(`Found ${hits} ${linkText} to page: ${displayURL}`);
  }
  
  console.log("==================");
  console.log("     END REPORT");
  console.log("==================");
}

function sortPages(pages) {
  // Validate input
  if (!pages || typeof pages !== 'object') {
    console.error("❌ Error: Invalid pages object provided to sortPages");
    return [];
  }

  const pagesArr = Object.entries(pages);
  
  // Check if there are entries to sort
  if (pagesArr.length === 0) {
    return [];
  }

  // Sort by hit count (descending order - highest first)
  pagesArr.sort((a, b) => {
    // Ensure both values are numbers
    const aHits = typeof a[1] === 'number' ? a[1] : 0;
    const bHits = typeof b[1] === 'number' ? b[1] : 0;
    
    // Sort from greatest to smallest
    return bHits - aHits;
  });
  
  return pagesArr;
}

module.exports = {
  sortPages,
  printReport,
};