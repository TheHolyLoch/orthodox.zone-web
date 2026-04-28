# Orthodox Zone

Orthodox Zone is a static public website for Orthodox Christian resources, project links, and plain educational material for Britain, Scotland, and the wider English-speaking world.

The site is intentionally small: HTML, CSS, and a little vanilla JavaScript for the mobile menu. It also holds a reusable visual system that can later be adapted for Orthodox Connect and Orthocal.

## Table of Contents

- [Requirements](#requirements)
- [Setup](#setup)
- [Structure](#structure)
- [Deployment](#deployment)
- [Related Projects](#related-projects)
- [Licence](#licence)

## Requirements

- A web browser
- Python 3, only if you want to run a local test server

## Setup

Serve the directory locally:

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

## Deployment

The site can be served by nginx or any static host. On the current Debian server, the intended target is:

```text
/var/www/orthodox.zone/html
```

Clone the repository on the server:

```sh
git clone https://github.com/TheHolyLoch/orthodox.zone-web.git
cd orthodox.zone-web
```

Check the source files, target directory, write access, and rsync availability:

```sh
./scripts/deploy.sh --check
```

Preview the copy operation:

```sh
./scripts/deploy.sh --dry-run
```

Deploy to the default target:

```sh
./scripts/deploy.sh
```

Deploy to a custom target:

```sh
DEPLOY_TARGET="/var/www/orthodox.zone/html" ./scripts/deploy.sh
```

The script does not use sudo. Run it as a user that can write to `/var/www/orthodox.zone/html`, or adjust ownership and permissions manually.

The script does not reload nginx. Static file changes should be served automatically.

## Related Projects

- [Orthodox Connect](https://github.com/TheHolyLoch/orthodox-connect)
- [Orthocal](https://github.com/TheHolyLoch/orthocal)

## Licence

ISC License. See `LICENSE`.
