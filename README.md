# Orthodox Zone

Orthodox Zone is a static public website for Orthodox Christian resources, project links, and plain educational material for Britain, Scotland, and the wider English-speaking world.

The site is intentionally small: HTML, CSS, and a little vanilla JavaScript for the mobile menu. It does not use tracking scripts, external fonts, or a frontend framework.

## Table of Contents

- [Requirements](#requirements)
- [Setup](#setup)
- [Structure](#structure)
- [Related Projects](#related-projects)
- [Licence](#licence)

## Requirements

- A web browser
- Python 3, only if you want to run a local test server

## Setup

Open `index.html` directly, or serve the directory locally:

```sh
python3 -m http.server 8080
```

Then visit:

```text
http://127.0.0.1:8080/
```

## Structure

```text
assets/
	css/
		style.css
	js/
		main.js
	img/
		README.md
about.html
connect.html
contact.html
index.html
orthocal.html
resources.html
saints.html
```

## Related Projects

- [Orthodox Connect](https://github.com/TheHolyLoch/orthodox-connect)
- [Orthocal](https://github.com/TheHolyLoch/orthocal)

## Licence

ISC License. See `LICENSE`.
