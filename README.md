# MCQer

A local-first question bank for courses, chapters, and MCQ practice. It uses the navy, gold, typography, and panel treatment of the UCC BIS Timetable.

Hosted app: **https://meetdanielme.github.io/mcqer/**

## Run

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite. For a production build, run `pnpm build`.

## Use

Create a course and chapter to write questions in the app, or import a JSON file generated from your lecture material. See [IMPORT_FORMAT.md](IMPORT_FORMAT.md) for the exact format and a prompt to give Notion AI. Practice a chapter to answer questions and see explanations and a score. Data stays in the local storage of each browser. **Download backup** exports the current data as JSON; **Restore backup** merges it back without removing existing courses or questions.

The GitHub Pages URL makes the app accessible on other devices, but it does not sync questions between them. There is no account or hosted database. Clearing site data removes that browser's question bank, so keep a backup.
