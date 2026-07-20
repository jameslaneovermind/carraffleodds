64% of Show HN launches are invisible to AI search
I ran a structured audit on 45 recent Show HN launches. Most of them cannot be identified or cited by ChatGPT, Perplexity, or Google AI Overviews, the places a growing share of "what should I use for X" questions now get answered. Here is the data, and the fix.

The numbers
64%
have no structured data (JSON-LD). This is the primary signal AI answer engines use to know what a page is and whether to cite it. Without it, you are functionally invisible to AI search.
51%
have no /llms.txt, the emerging convention that tells AI crawlers what your site is and what to cite. Cheap to add, and a first-mover edge in 2026.
13%
have no clear call-to-action found in the page HTML above the fold. For a launch, that is conversions walking out the door.
9%
have no meta description, the snippet that decides whether anyone clicks your search result.
29%
had zero critical issues. The good news: the fixes are fast, and doing them puts you ahead of roughly two-thirds of your peers.
Why this matters more in 2026
For a decade, "being found" meant Google's ten blue links. That is no longer where a large and growing slice of discovery happens. When someone asks ChatGPT "what's a good tool for X," or Google shows an AI Overview instead of links, the engine picks a handful of sources to name. It picks the ones it can parse and trust. Structured data and clean, readable server HTML are how you get into that set. Most launches have optimized for the old game and done nothing for the new one, which is exactly the opening: the bar is low and the fix is quick.

The fix (free, do it yourself)
Add JSON-LD. Drop a <script type="application/ld+json"> with schema.org Organization, SoftwareApplication/Product, and a FAQPage. Validate at validator.schema.org.
Add /llms.txt. A short file describing what your site is and what to cite. Ten minutes.
Make your value copy server-rendered. If your headline is painted in by client JS, AI crawlers may never read it. View source, not the rendered DOM.
Write answer-shaped content. Phrase a heading as the question a user asks, answer it in the first sentence. Answer engines lift these verbatim.
You might be in the 64%. Fix it in about 15 minutes.
The 2026 AI-Search Visibility Kit: copy-paste JSON-LD schema templates (Organization, Product, FAQ), an llms.txt template, and the exact steps to make your site identifiable and citable by ChatGPT, Perplexity, and Google AI Overviews. Instant download.

Get the AI-Visibility Kit — $5
Prefer it done for you? Reply / email your URL and I will run the full audit of your specific site, free. Want the complete 42-point method for the whole site (SEO, speed, conversion too)? That is the $19 Website Audit Playbook.

Method & honesty: the audit measures real signals from each page (server HTML, HTTP headers, and a rendered load): structured data, llms.txt, meta, headings, call-to-action, load timing. The sample was 45 recent Show HN launches. The numbers are real and reproducible from the public pages in the sample. If your site was in the sample and you would like its specific findings, just ask.