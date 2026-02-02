# Apple Shortcut Guide

## Create the Shortcut

1. Open **Shortcuts** app on iPhone/Mac
2. Tap **+** to create new shortcut
3. Add these 4 actions:

### Action 1: Dictate Text
- Search "Dictate Text"
- Add it

### Action 2: Get Contents of URL
- Search "Get Contents of URL"
- Configure:
  - **URL:** `https://your-domain.com/ask`
  - **Method:** `POST`
  - **Headers:**
    - `Authorization` → `Bearer YOUR-API-KEY`
    - `Content-Type` → `application/json`
  - **Request Body:** `JSON`
    - Key: `message`
    - Value: Select **Dictated Text** variable

### Action 3: Get Dictionary Value
- Search "Get Dictionary Value"
- **Key:** `response`

### Action 4: Speak Text
- Search "Speak Text"
- Select the dictionary value

## Name & Configure

1. Tap the name at top → rename to **"OpenClaw"**
2. Tap dropdown → **"Add to Siri"**
3. **Record your voice** saying the trigger phrase

## Siri Settings

Go to **Settings → Siri & Search → Siri Responses**

Set to **"Always"** so Siri speaks responses aloud.

## Usage

> "Hey Siri, run OpenClaw"

Wait for dictation, then speak your question.

## Tips

- Use **"run [name]"** for reliable triggering
- Avoid names that sound like contacts or commands
- Keep the shortcut name unique (e.g., "Jarvis", "Assistant")
