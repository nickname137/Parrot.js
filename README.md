# 🦜 Parrot.js — Chrome Extension

Parrot.js is a **Chrome Extension** that automates the process of searching and downloading pronunciation audio files from [Forvo.com](https://forvo.com). It supports **all languages** on Forvo and allows accent filtering for English, Spanish, and Portuguese.

> 📌 This extension opens a side panel that lets you queue words, manage downloads, and handle not-found entries — all from within your browser.

![](https://github.com/nickname137/Parrot.js/blob/main/sidepanel0.png)
---

## ✨ Features

- 🔍 Search for words across any Forvo-supported language
- 🗣️ Filter by accent (English, Spanish, Portuguese)
- 📥 Download up to N audio files per word
- 🏷️ Custom file naming with patterns and optional tags
- 🛑 Pause, resume, and clear controls

---

## 🛠 Interface Overview

### Language & Accent

- Select a **language**.
- Choose an **accent** (only appears for English, Spanish, Portuguese).

---

### 🔡 Input Fields

| Field | Description |
|-------|-------------|
| **Words to Search** | Paste or enter multiple words (one per line or separated by a comma). |
| **Not Found Words** | Automatically populated if a word is not found. |
| **Download Limit** | Max number of audio files per word. |
| **Name Pattern** | Filename format. |
| **Tag** | Optional label added to filenames. |

---

### 📦 Filename Pattern Options

| Pattern | Example Filename |
|---------|------------------|
| `word_1.mp3` | `lead.mp3` |
| `word_en_uk_1.mp3` | `lead_en_uk.mp3` |
| `word_tag_1.mp3` | `lead_verbs.mp3` |
| `word_en_uk_tag_1.mp3` | `lead_en_uk_verbs.mp3` |

> ⚠️ If **Download Limit** is `1`, the filename does not include index numbers.

---

### 🧭 Control Buttons

#### "Words for Searching" Section

| Button | Description |
|--------|-------------|
| **Start** | Begins download. Resumes paused or interrupted tasks. |
| **Resume** | Resumes if paused or after login. |
| **Pause** | Pauses all active downloads/searches. |
| **Reset** | Clears queue and resets state. |

#### "Not Found Words" Section

| Button | Description |
|--------|-------------|
| **Copy to clipboard** | Copies list to clipboard. |
| **Clear** | Empties the not-found list. |

---

## 🚀 How It Works (Under the Hood)

1. **Tab Management:**
   - Each word opens in a new background tab with encoded settings:
     ```
     https://forvo.com/word/{word}/#{lang}?accent={accent}&start=true&limit={limit}&pattern={pattern}&tag={tag}
     ```

2. **Script Injection:**
   - `background.js` listens for tab loads and injects `search.js`.

3. **Queue Management:**
   - Words and their options are stored as pairs: `[word, config]`.

4. **Downloads:**
   - Files are downloaded via `chrome.downloads.download()`.
   - `waitForDownloadComplete()` ensures sequential downloading.

5. **Login Handling:**
   - If logged out, opens a login tab.

---

## 🔄 Special Cases

| Case | Behavior |
|------|----------|
| **Word Not Found** | Added to “Not Found Words” list. |
| **User Logged Out** | Redirects to login, resumes queue afterward. |
| **Interrupted Download** | Logs a warning(devTools console), moves to next file. |
| **Pause** | Halts processing, retains state. |
| **Reset** | Empties queue and resets. |

---

## 📂 File Structure
parrot.js/
- manifest.json
- background.js
- search.js
- login.js
- accentOptions.js
- sidepanel.js
- sidepanel.css
- sidepanel.html
- icons/

---

## 🧪 Example Workflow

1. Open [forvo.com](https://forvo.com)
2. Click the Parrot.js icon to open the side panel.
3. Configure options:
   - Language: `English`
   - Accent: `American`
   - Limit: `1`
   - Pattern: `word_en_uk_tag_1.mp3`
   - Tag: `verbs`

4. Enter words: lead, read, write

5. Click **Start**
Downloads begin. Missing words are recorded in the "Not Found Words" field.

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| **No downloads?** | Ensure you're logged into Forvo. Check Downloads folder |
| **Missing audio?** | Check spelling or try a different accent. |
| **Paused?** | Click **Resume** to continue |
| **Clearing not working?** | Refresh Forvo.com, then try again |

---

## 🙌 Contributions

Want to improve Parrot.js? Open an issue or pull request. Contributions welcome! My telegram: @chiefbromden
