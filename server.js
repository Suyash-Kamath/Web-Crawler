const express = require("express");
const cors = require("cors");
const { crawlPage } = require("./crawl");
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // Serve static files from public directory

let lastCrawlData = [];

function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function formatURL(url) {
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

app.post("/crawl", async (req, res) => {
  const { url } = req.body;

  // Validate input
  if (!url) {
    return res.status(400).json({ 
      error: "Missing URL",
      message: "Please provide a URL to crawl" 
    });
  }

  if (typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({ 
      error: "Invalid URL format",
      message: "URL must be a non-empty string" 
    });
  }

  const formattedURL = formatURL(url.trim());

  // Validate URL format
  if (!isValidURL(formattedURL)) {
    return res.status(400).json({ 
      error: "Invalid URL",
      message: "Please provide a valid URL (e.g., https://example.com)" 
    });
  }

  console.log(`🚀 Starting crawl of: ${formattedURL}`);

  try {
    const pages = await crawlPage(formattedURL, formattedURL, {});
    
    // Check if crawl returned any data
    if (!pages || Object.keys(pages).length === 0) {
      return res.status(404).json({ 
        error: "No pages found",
        message: "The website couldn't be crawled or contains no internal links",
        links: []
      });
    }

    // Convert pages object to array format
    const links = Object.entries(pages)
      .map(([page, hits]) => ({
        url: page.startsWith('http') ? page : `https://${page}`,
        hits: hits || 0
      }))
      .sort((a, b) => b.hits - a.hits); // Sort by hits descending

    lastCrawlData = links;
    
    console.log(`✅ Crawl completed! Found ${links.length} pages`);
    
    res.json({ 
      links,
      totalPages: links.length,
      totalLinks: links.reduce((sum, link) => sum + link.hits, 0),
      baseURL: formattedURL
    });

  } catch (err) {
    console.error("❌ Crawl error:", err.message);
    
    let errorMessage = "Failed to crawl website";
    let statusCode = 500;

    // Handle specific error types
    if (err.code === 'ENOTFOUND') {
      errorMessage = "Website not found. Please check the URL and try again.";
      statusCode = 404;
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage = "Connection refused. The server might be down.";
      statusCode = 503;
    } else if (err.message.includes('fetch')) {
      errorMessage = "Unable to fetch the webpage. Please check your internet connection.";
      statusCode = 502;
    } else if (err.name === 'TypeError' && err.message.includes('Invalid URL')) {
      errorMessage = "Invalid URL provided";
      statusCode = 400;
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.get("/download", (req, res) => {
  try {
    if (!lastCrawlData || lastCrawlData.length === 0) {
      return res.status(400).json({ 
        error: "No data available",
        message: "Please crawl a website first before downloading data" 
      });
    }

    // Create CSV with proper headers
    const fields = [
      { label: 'URL', value: 'url' },
      { label: 'Link Count', value: 'hits' }
    ];
    
    const parser = new Parser({ fields });
    const csv = parser.parse(lastCrawlData);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `crawled_links_${timestamp}.csv`;
    const filepath = path.join(__dirname, filename);

    // Write file safely
    fs.writeFileSync(filepath, csv, 'utf8');

    // Set proper headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send file and clean up
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download file" });
        }
      }
      
      // Clean up file after download
      setTimeout(() => {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        } catch (cleanupErr) {
          console.error("File cleanup error:", cleanupErr);
        }
      }, 5000); // Delete after 5 seconds
    });

  } catch (err) {
    console.error("CSV generation error:", err);
    res.status(500).json({ 
      error: "Failed to generate CSV file",
      message: "There was an error creating the download file"
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: "Something went wrong on the server"
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});