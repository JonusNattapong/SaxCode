import sys
import os
import certifi

# Fix for curl_cffi on Windows showing SSL issuer certificate errors
os.environ["CURL_CA_BUNDLE"] = certifi.where()
os.environ["SSL_CERT_FILE"] = certifi.where()

import html2text
from scrapling import Fetcher

def fetch_and_convert(url):
    try:
        html_content = ""
        try:
            # Initialize the stealth fetcher
            fetcher = Fetcher()
            page = fetcher.get(url)
            
            # Extract content from Scrapling object
            html_content = page.text
            if hasattr(page, 'html'):
                html_content = page.html
        except Exception as fetch_err:
            # If curl_cffi gets blocked by local SSL/Cert issues on Windows, fallback to standard urllib
            if "certificate " in str(fetch_err).lower() or "ssl " in str(fetch_err).lower() or "curl: (60)" in str(fetch_err):
                import urllib.request
                import ssl
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                response = urllib.request.urlopen(req, context=ctx)
                html_content = response.read().decode('utf-8', errors='ignore')
            else:
                raise fetch_err
                
        # Now convert the HTML to clean Markdown
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.bypass_tables = False
        h.ignore_images = True
        
        md = h.handle(html_content)
        
        # Output safely to stdout for node to read
        print(md)


    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scraper.py <url>")
        sys.exit(1)
        
    target_url = sys.argv[1]
    fetch_and_convert(target_url)
