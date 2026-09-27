# MCQer

A question bank for courses, chapters, and MCQ practice. It uses the navy, gold, typography, and panel treatment of the UCC BIS Timetable.

Hosted app: **https://meetdanielme.github.io/mcqer/**

## Run

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite. For a production build, run `pnpm build`.

## Use

Courses published in [public/questions](public/questions) load automatically for everyone who opens the hosted app. Create a course and chapter in the app, or import a JSON file, for personal practice in that browser. See [IMPORT_FORMAT.md](IMPORT_FORMAT.md) for the exact format and a prompt to give Notion AI. Practice a chapter to answer questions and see explanations and a score. **Download backup** exports the visible bank as JSON; **Restore backup** merges it into that browser.

## Publish future questions for classmates

1. Ask Notion AI for a JSON file using [IMPORT_FORMAT.md](IMPORT_FORMAT.md). Review the questions and answer key.
2. In this repository, run `pnpm publish:questions path/to/file.json`. The script validates the file and merges it into the course file in `public/questions/`; stable question IDs update existing questions.
3. Commit and push the changed `public/questions/` files. The Pages workflow tests and deploys them. On the next page load, everyone sees the published questions.

Importing a file **inside the app** saves it only in that browser. The static GitHub Pages site cannot commit it to GitHub on its own. Questions you add manually in the app are also browser-only until they are included in a JSON file and published.

There is no account or hosted database. Browser-only questions do not sync between devices, and clearing site data removes them. Keep a backup.
