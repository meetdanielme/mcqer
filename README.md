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
3. Commit and push the changed `public/questions/` files. The Pages workflow tests and deploys them. The app downloads the new version online and offers a reload prompt so a quiz is not interrupted.

Importing a file **inside the app** saves it only in that browser. The static GitHub Pages site cannot commit it to GitHub on its own. Questions you add manually in the app are also browser-only until they are included in a JSON file and published.

There is no account or hosted database. Browser-only questions do not sync between devices, and clearing site data removes them. Keep a backup.

## Install and use offline

Open the hosted app online once and wait for **Available offline** in the header. The app, fonts, import guide, and all published courses are then stored on the device. You can reopen MCQer, practice, import local JSON files, and download or restore backups without a connection.

Use **Install app** when offered, or your browser’s install menu. On iPhone/iPad, open the site in Safari and choose **Share → Add to Home Screen**. Installation is optional for offline use. If you install it separately, open the installed app online once and check its offline status too.

When a new app or question-bank version is downloaded, choose **Reload to update** when you finish practicing, or **Later** to keep studying. Personal questions stay in browser storage. Clearing site data removes local questions and offline downloads; browsers may also evict stored data, so keep exported backups.

On mobile, use the hamburger menu to switch courses or access imports and backups. On desktop, these tools live in the left sidebar.

Offline caching is enabled in production builds. To check it locally at the same path as GitHub Pages:

```sh
pnpm build --base /mcqer/
pnpm preview --base /mcqer/
```

Open `/mcqer/` on the preview server, wait for the offline indicator, then switch the browser’s network settings offline and reload. The service worker is scoped to this app’s base path.

## Images and HTML charts

Use **Add question** to upload an optional PNG/JPEG/WebP image or a self-contained HTML chart. Add a description, preview the chart, then save the question. Practice displays media above the answer choices with an enlarge control. Existing text-only questions continue to work.

Personal questions and media use IndexedDB; existing localStorage questions migrate automatically. Backups embed images and HTML. Shared images are stored in `public/questions/images/` and cached with the app; published HTML charts are included in question JSON. See [IMPORT_FORMAT.md](IMPORT_FORMAT.md) for the optional fields, limits and Notion prompt. HTML charts must include their own styles and chart code to work offline; CDN dependencies are blocked.
