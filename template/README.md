# App

A mobile app built as a PWA: plain HTML, CSS and JavaScript with no framework,
no build step and no dependencies. It installs to a phone's home screen from a
URL and works offline.

## Run it

```
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open http://localhost:8765. Edit a file and reload; there is nothing to
build.

## Put it on a phone

The phone needs an HTTPS URL, because browsers only allow service workers on
HTTPS or localhost. With [Tailscale](https://tailscale.com) on both devices:

```
tailscale serve --bg 8765
tailscale serve status        # prints the https://<machine>.<tailnet>.ts.net URL
```

Open that URL on the phone and choose "Add to Home Screen". It works only for
devices on your tailnet, and only while this machine is serving.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The page: header bar and the `#app` element the app renders into |
| `style.css` | Layout, light and dark themes, safe-area padding for the notch |
| `app.js` | The app's code, loaded as an ES module |
| `sw.js` | Service worker: network first, cached copy when offline |
| `manifest.json` | Name, colours and icons used when installed |
| `icon-180.png`, `icon-512.png` | Home screen icons (iOS uses the 180px one) |

When you add a file the app needs offline, add it to `SHELL` in `sw.js`.
