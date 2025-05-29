const { crawlPage } = require('./crawl.js');
const { printReport } = require('./report.js');

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function main() {
    // Check for missing URL
    if (process.argv.length < 3) {
        console.log("❌ No website provided");
        console.log("Usage: node main.js <URL>");
        console.log("Example: node main.js https://example.com");
        process.exit(1);
    }

    // Check for too many arguments
    if (process.argv.length > 3) {
        console.log("❌ Too many command line arguments");
        console.log("Usage: node main.js <URL>");
        process.exit(1);
    }

    let baseURL = process.argv[2];
    
    // Add protocol if missing
    if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {
        baseURL = 'https://' + baseURL;
        console.log(`🔧 Added protocol: ${baseURL}`);
    }

    // Validate URL format
    if (!isValidURL(baseURL)) {
        console.log("❌ Invalid URL format");
        console.log("Please provide a valid URL (e.g., https://example.com)");
        process.exit(1);
    }

    console.log("🚀 Starting crawl of " + baseURL);
    console.log("⏱️  This may take a while...\n");

    try {
        const pages = await crawlPage(baseURL, baseURL, {});

        if (Object.keys(pages).length === 0) {
            console.log("⚠️  No pages were crawled. Check if the URL is accessible.");
            process.exit(1);
        }

        console.log(`\n✅ Crawl completed! Found ${Object.keys(pages).length} pages.\n`);

        // Uncomment this block to log all crawled pages and their counts
        // console.log("📄 All crawled pages:");
        // for (const [page, count] of Object.entries(pages)) {
        //     console.log(`  ${page} (${count} links)`);
        // }
        // console.log();

        printReport(pages);
    } catch (err) {
        console.error("❌ Error during crawl:", err.message);
        
        // Provide helpful error messages for common issues
        if (err.code === 'ENOTFOUND') {
            console.log("💡 This usually means the website doesn't exist or is unreachable.");
        } else if (err.code === 'ECONNREFUSED') {
            console.log("💡 Connection was refused. The server might be down.");
        } else if (err.message.includes('fetch')) {
            console.log("💡 There was a problem fetching the webpage. Check your internet connection.");
        }
        
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

main();