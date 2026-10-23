# MCQer import format

Open MCQer at **https://meetdanielme.github.io/mcqer/**. Questions committed to the public repository load automatically for every visitor. Notion AI does not need GitHub access; it prepares the file for publication.

MCQer uses UTF-8 JSON files. Give your Notion AI agent the instructions below and ask it to return a **downloadable `.json` file**, with no Markdown code fence or commentary inside the file. Review the file, then add it to this repository with the publishing command below. The app will load it for everyone after deployment. You can use **Import JSON file** to preview it privately in your own browser first.

## Prompt for Notion AI

> Using only the lecture materials I provide, create multiple-choice questions for MCQer at https://meetdanielme.github.io/mcqer/. Produce a downloadable UTF-8 `.json` file containing one valid JSON object in the version 1 format below. This file will be reviewed and published in a public GitHub repository so classmates can use the questions. Do not include private notes, personal information, or copyrighted slide text copied at length. Do not wrap the JSON in a Markdown code fence or add commentary to the file. Use my exact course code and title, and group questions by lecture chapter. Write four plausible, distinct options per question. Give each question a stable, unique ID in the form COURSE-CHAPTER-001 so future publications can update the same question. Set correctOptionId to the ID of the correct option. Include a short explanation of why it is correct and a source reference to the lecture or slide. Do not invent unsupported facts. Avoid ambiguous answers, “all of the above”, and duplicate questions. Give me the JSON file to download; do not publish the lecture materials.

## Example

```json
{
  "version": 1,
  "course": {
    "code": "EC2204",
    "title": "Business Economics 1"
  },
  "chapters": [
    {
      "title": "Markets, Price Signals & Equilibrium",
      "description": "Demand, supply, and market equilibrium.",
      "questions": [
        {
          "id": "EC2204-MARKETS-001",
          "stem": "What happens to equilibrium price when demand increases and supply stays constant?",
          "options": [
            { "id": "A", "text": "It decreases" },
            { "id": "B", "text": "It increases" },
            { "id": "C", "text": "It stays the same" },
            { "id": "D", "text": "It becomes zero" }
          ],
          "correctOptionId": "B",
          "explanation": "An outward shift of demand raises both equilibrium price and quantity when supply does not change.",
          "source": "Week 3 lecture slides"
        }
      ]
    }
  ]
}
```

## Rules

- `version` must be `1`.
- `course.code` and `course.title` are required. The code identifies the course when importing again.
- `chapters` must contain at least one chapter. Each chapter needs a unique `title` and a `questions` array. `description` is optional.
- Each question needs a unique string `id`, `stem`, 2–6 `options`, `correctOptionId`, and `explanation`. `source` is optional.
- Each option needs a unique string `id` and non-empty `text`. `correctOptionId` must equal one of those IDs.
- A new chapter is added. A chapter with the same title in the same course is merged. A question with the same ID in that chapter is updated. Other questions are kept.
- Import validates the whole file before changing anything. A file imported through the app is private to that browser until it is published to the repository. A backup includes all visible courses, whereas a Notion AI import file contains one course.

## Publish to the shared app

From the MCQer repository, run:

```sh
pnpm publish:questions /path/to/notion-ai-export.json
pnpm test
pnpm validate:questions
pnpm build --base /mcqer/
git add public/questions/
git commit -m "Publish new MCQs"
git push
```

The command validates and merges the file into `public/questions/`. GitHub Pages deploys the updated bank after the push. Ask Codex to run these steps if you prefer. The app downloads the updated bank and offers a reload prompt; choose Reload to update when you finish practicing. Browser-only changes and drafts remain on that device until published.

This format is for MCQs only. No flashcard fields are used.

## Optional question images

Add an `image` object to a question. Both fields are required when an image is present:

```json
"image": {
  "src": "questions/images/demand-curve.png",
  "alt": "A demand curve shifting to the right against an unchanged supply curve"
}
```

For shared images, place the file in `public/questions/images/` and use the base-relative `questions/images/filename.png` path (no leading slash). File names may contain letters, numbers, hyphens and underscores. PNG, JPEG and WebP are supported, up to 1 MB per image. The publication validator checks that files exist and match their declared image type. Commit the referenced files along with the question JSON; they are cached for offline use.

For portable imports, `image.src` can instead contain a complete `data:image/png;base64,...`, `data:image/jpeg;base64,...` or `data:image/webp;base64,...` value. The publishing command extracts embedded images into files automatically. External image URLs and SVG image files are not supported. Use an HTML chart for inline SVG instead.

The Add question form accepts image uploads, resizes large images to at most 1600 pixels, and asks for a description. Downloaded backups embed all question images, including shared images, so restoring them does not depend on the original site.

## Optional HTML charts

Add an `artifact` object to a question:

```json
"artifact": {
  "title": "Supply and demand equilibrium",
  "html": "<svg viewBox=\"0 0 400 200\" role=\"img\" aria-label=\"Supply and demand chart\"><path d=\"M40 20V170H380 M60 40L340 150 M60 150L340 40\" stroke=\"navy\" fill=\"none\"/></svg>"
}
```

Both `title` and `html` are required. HTML is limited to 512 KB per question. You can also upload a `.html` or `.htm` file when adding a question. Images and HTML charts may appear together on the same question; both fields are optional for existing text-only questions.

Charts run in an isolated iframe with inline scripts and styles enabled. They cannot access MCQer storage or the parent page. Network requests, remote scripts, external stylesheets, nested frames, plugins and form submissions are blocked. Bundle any chart library into the HTML, or prefer inline SVG; CDN-based Chart.js, Plotly, D3 or Mermaid imports will not work. Use responsive sizing such as `viewBox` for SVG.

Suggested Notion prompt:

> Produce a downloadable, self-contained HTML chart for this MCQ. Prefer accessible inline SVG with a viewBox, a clear title, and readable labels. Include all CSS and any JavaScript inline. Do not use CDN libraries, external images, web fonts, imports, fetch calls or other network dependencies. Keep it under 512 KB and make it usable on a narrow mobile screen. Do not reveal the correct answer in labels or descriptions. For a JSON import, put the complete HTML string in artifact.html and its description in artifact.title on the relevant question.

HTML charts are embedded in imports, published question JSON and backups, so they work offline once the question bank is available offline. Review charts visually and check their correctness before publication.
