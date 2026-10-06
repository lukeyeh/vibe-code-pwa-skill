---
name: vibe-code-pwa
description: Scaffold and build a mobile app as a dependency-free PWA (plain HTML, CSS and JavaScript, no framework, no build step, no npm) developed entirely from Claude Code on Linux, and put it on a real phone over a private HTTPS URL with Tailscale. Use when the user wants to make, start or "vibe code" a mobile or phone app with few or no dependencies, asks for a PWA or a home-screen web app, wants to test a local web app on their phone, or is working in a project scaffolded by this skill (an `index.html` + `sw.js` + `manifest.json` with no `package.json`). Not for apps that must be in an app store or need Bluetooth, NFC or background work; say so and stop.
---

# Vibe-coding a mobile app as a PWA

The app is a folder of static files. There is nothing to install and nothing
to build: edit a file, reload the phone. `template/` next to this file is a
working app shell; `scripts/` holds two helpers.

Check this is the right route before scaffolding. A PWA installs from a URL,
not a store, and on iOS it has no Bluetooth, NFC or background execution, and
push notifications only after the user adds it to the home screen. If the app
needs any of that, tell the user and stop; the alternative on Linux is native
Android (Kotlin, command-line SDK), which is a different setup.

## Steps

1. **Find out what the app is** if the user has not said: a sentence or two,
   and a name. The shell is not worth much without it.
2. **Create the repo with jj** (the user uses jj, not raw git):
   `jj git init <dir>`.
3. **Copy the template**: everything in `template/` into the project root.
4. **Name it**: replace `App` in `index.html` (`<title>` and `<h1>`),
   `manifest.json` (`name` and `short_name`) and the README heading. To change
   the bar colour, change `--bar` in `style.css` and the two `#111827` values
   in `manifest.json` and the `theme-color` meta together, then regenerate the
   icons: `python3 scripts/icon.py --bg <RRGGBB> --fg <RRGGBB> <dir>`.
5. **Serve it** in the background, bound to localhost:
   `python3 -m http.server 8765 --bind 127.0.0.1`. Pick another port if 8765
   is taken.
6. **Build the app** in `app.js`, `style.css` and `index.html`. Look at it as
   you go with a phone-sized headless screenshot, and read the image:
   ```
   google-chrome --headless=new --disable-gpu --window-size=390,844 \
     --virtual-time-budget=3000 --screenshot=<scratch>/shot.png http://127.0.0.1:8765/
   ```
7. **Check it installs and works offline**: `node scripts/check.mjs <dir>`.
   It serves the folder on its own port, waits for the service worker, stops
   the server and reloads. Run it after adding files, not just once.
8. **Put it on the phone**: see the next section.
9. **`jj describe`** the change. Do not push or deploy unless asked.

## Getting it on the phone

Browsers only run service workers on HTTPS or on localhost, so the phone
needs an HTTPS URL. Opening `http://<tailscale-ip>:8765` loads the page but
the app cannot install or work offline. `tailscale serve` puts a real
certificate in front of the local server, visible only to the user's own
devices.

Check the state first with `tailscale status`, then do only what is missing:

| State | What to do |
| --- | --- |
| `tailscale: command not found` | The user runs `curl -fsSL https://tailscale.com/install.sh \| sh` (needs sudo) |
| `Logged out.` | The user runs `sudo tailscale up --operator=$USER` and opens the link it prints |
| Phone not listed, or offline | The user installs the Tailscale app on the phone and signs in to the same account |
| Connected | `tailscale serve --bg 8765`, then `tailscale serve status` for the URL |

Steps that need sudo or a browser login are the user's: ask them to run the
command with the `!` prefix so the output lands in the conversation.

`tailscale serve` answering `Access denied: serve config denied` means the
user is not the operator. Either they run it with sudo, or they run
`sudo tailscale set --operator=$USER` once. Check `tailscale serve status`
before concluding nothing is served; they may have set it up already.

Then confirm the URL works from this machine, since the phone gives no error
detail: `curl -s -o /dev/null -w '%{http_code}\n' https://<machine>.<tailnet>.ts.net/sw.js`.
The first request can take several seconds while the certificate is issued.
If the name does not resolve or the certificate fails, MagicDNS and HTTPS
certificates need enabling in the Tailscale admin console (DNS page).

The user opens the URL on the phone and chooses "Add to Home Screen" (the
Share menu in Safari, the three-dot menu in Chrome). The URL works only while
this machine is on and serving.

## How the shell is put together

| File | What it does |
| --- | --- |
| `index.html` | Header bar, a `#app` element to render into, the manifest and icon links, the iOS meta tags |
| `style.css` | Full-height column layout, light and dark themes, safe-area padding |
| `app.js` | The app, as an ES module. Registers the service worker |
| `sw.js` | Network first, cache as the offline fallback |
| `manifest.json` | Name, colours, icons, `display: standalone` |
| `icon-180.png`, `icon-512.png` | Placeholders from `scripts/icon.py` |

Split code into more modules with plain `import`; the browser loads them
directly. Keep every URL relative (`sw.js`, not `/sw.js`) so the app also
works when hosted under a sub-path.

## Gotchas

- **Every file needed offline goes in `SHELL` in `sw.js`.** A missing or
  misspelt entry fails the whole service worker install, silently: the app
  works online and never offline. `scripts/check.mjs` catches this.
- **Keep the service worker network-first while developing.** Cache-first is
  the usual tutorial pattern and it means edits do not appear until the cache
  name is bumped. The template also fetches with `cache: 'no-cache'` so the
  browser's HTTP cache cannot serve an old file. Bump `CACHE` only to drop
  files that no longer exist.
- **iOS takes the home screen icon from `apple-touch-icon`**, a PNG, not from
  the manifest. Keep the 180px PNG.
- **iOS tints the status bar area from the page background, not the header.**
  With a dark header on a light page, an installed app showed a pale blurred
  band over the top of the header. The template avoids it by making `html` and
  `body` the bar colour and painting the content colour on `main`, with the
  `black-translucent` status bar meta for light clock text. Keep that
  arrangement when restyling.
- **iOS reads the name, icon and status bar meta tags when the app is added.**
  After changing them, the user must delete the home screen icon and add it
  again. Ordinary HTML, CSS and JS changes only need the app closed and
  reopened.
- **An installed app has its own storage on iOS**, separate from the same URL
  open in Safari. Data entered in one does not appear in the other.
- **The phone shows no console.** When something fails only on the phone,
  render the error into the page, or reproduce it with the headless screenshot.
- **`pkill -f 'http.server 8765'` kills the shell running it**, because the
  pattern matches its own command line. Use `pgrep -f 'http[.]server 8765'`
  and kill those PIDs.

## Common tasks

**Store data**: `localStorage` for small settings, IndexedDB for anything
larger or structured. It lives on the device; there is no sync without a
backend.

**Add a screen**: render into `#app` from a function per screen and switch on
`location.hash`, so the back gesture works. No router library.

**Use a library**: only if the user asks. Vendor the single ES module file
into the repo and add it to `SHELL`; do not add npm or a CDN link, which
breaks offline use.

**Make it work when the desktop is off, or share it**: host the folder on any
static HTTPS host (Cloudflare Pages, GitHub Pages). This publishes it, so do
it only when asked.

## Decisions already made, and why

Explain the trade-off if the user asks, but do not reopen these unprompted.

- **No framework, bundler, TypeScript or npm.** The user asked for the lowest
  dependency route. The whole toolchain is a browser and `python3`.
- **PWA rather than native or Expo.** It is the only route from Linux that
  reaches both iPhone and Android without a Mac or a paid build service.
- **Tailscale rather than public hosting for development.** Private by
  default, no account beyond Tailscale, and edits are live on reload.
