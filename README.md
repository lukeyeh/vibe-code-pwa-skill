# vibe-code-pwa

A Claude Code skill for building a mobile app with as few dependencies as
possible: a PWA written in plain HTML, CSS and JavaScript, developed from
Claude Code on Linux and tested on a real phone over a private
[Tailscale](https://tailscale.com) HTTPS URL.

There is no framework, no build step and no `node_modules`. The toolchain is a
browser and `python3 -m http.server`.

## What a scaffolded project has

- An app shell: header bar, content area, light and dark themes, padding for
  the notch and home indicator.
- A manifest and icons, so it installs to the home screen and opens full
  screen.
- A service worker that is network-first, so edits show on reload, with the
  cache as the offline fallback.
- A README covering running it and putting it on a phone.

## Installing the skill

```
git clone https://github.com/lukeyeh/vibe-code-pwa-skill ~/.claude/skills/vibe-code-pwa
```

Then ask Claude Code to start a mobile app.

## What is in here

| Path | Contents |
| --- | --- |
| `SKILL.md` | The instructions: scaffolding steps, Tailscale setup, gotchas, decisions and why |
| `template/` | The app shell that gets copied |
| `scripts/icon.py` | Writes placeholder icons in a chosen colour. Standard library only |
| `scripts/check.mjs` | Checks in headless Chrome that an app installs its service worker and loads offline |

## Using the template without Claude

```
cp -r template myapp && cd myapp
python3 -m http.server 8765 --bind 127.0.0.1
tailscale serve --bg 8765     # then open the URL from `tailscale serve status` on the phone
```

## Limits

A PWA installs from a URL, not an app store. On iOS it has no Bluetooth, NFC
or background execution, and push notifications work only once it is on the
home screen.

## Status

Checked on Ubuntu 24.04 with Chrome, Node 24 and Tailscale 1.102 in October
2026: the template serves, renders at phone size, installs its service worker
and loads with the server stopped (`scripts/check.mjs`), and is reachable over
`tailscale serve`. It was added to the home screen of an iPhone; Android was
not tried.
