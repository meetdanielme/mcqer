# MCQer import format

Open MCQer at **https://meetdanielme.github.io/mcqer/**. The hosted app accepts a JSON file from your device; your Notion AI agent does not need access to the GitHub repository.

MCQer imports UTF-8 JSON files. Give your Notion AI agent the instructions below and ask it to return a **downloadable `.json` file**, with no Markdown code fence or commentary inside the file. Download the file from Notion, open the hosted MCQer app, and choose **Import JSON file**. You can import the same file again after revising it; stable IDs update existing questions.

## Prompt for Notion AI

> Using only the lecture materials I provide, create multiple-choice questions for MCQer at https://meetdanielme.github.io/mcqer/. Produce a downloadable UTF-8 `.json` file containing one valid JSON object in the version 1 format below. Do not wrap the JSON in a Markdown code fence or add commentary to the file. Use my exact course code and title, and group questions by lecture chapter. Write four plausible, distinct options per question. Give each question a stable, unique ID in the form COURSE-CHAPTER-001 so future imports can update the same question. Set correctOptionId to the ID of the correct option. Include a short explanation of why it is correct and a source reference to the lecture or slide. Do not invent unsupported facts. Avoid ambiguous answers, “all of the above”, and duplicate questions. Give me the file to download; do not publish the lecture materials or question file to GitHub.

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
- Import validates the whole file before changing anything. GitHub Pages hosts only the app code. Your courses and MCQs are stored in the browser you use, and do not automatically appear on another device. For now, use **Download backup** on one device and **Restore backup** on another to copy your bank. A backup includes all courses, whereas a Notion AI import file contains one course. Keep a backup before clearing browser data.

This format is for MCQs only. No flashcard fields are used.
