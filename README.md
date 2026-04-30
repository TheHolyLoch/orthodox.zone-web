# Orthodox Zone

Orthodox Zone is a static public website for Orthodox Christian resources, project links, and plain educational material for Britain, Scotland, and the wider English-speaking world.

The source content is edited in Markdown, then built into plain HTML, CSS, JavaScript, and assets under `public/`. The live site stays static and can be served by nginx or any normal static host.

## Table of Contents

- [Requirements](#requirements)
- [Authoring](#authoring)
- [Structure](#structure)
- [Front Matter](#front-matter)
- [Clean URLs](#clean-urls)
- [Calendar Page](#calendar-page)
- [Deployment](#deployment)
- [Related Projects](#related-projects)
- [Licence](#licence)

## Requirements

- Go 1.22 or newer
- Python 3, only if you want to run a local preview server
- rsync, recommended for deployment

## Authoring

Edit Markdown files under `content/`.

Put shared site assets under `assets/`. Put page media such as images or PDFs under `content/media/` or downloadable files under `content/files/` when those directories are needed.

Build the static site:

```sh
./scripts/build.sh
```

Preview the generated output:

```sh
python3 -m http.server 8080 -d public
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
		calendar.js
		main.js
cmd/
	ozbuild/
		main.go
content/
	index.md
	about.md
	contact.md
	projects/
		index.md
		connect.md
		calendar.md
	resources/
		index.md
	saints/
		index.md
internal/
	site/
		site.go
templates/
	base.html
	partials/
		footer.html
		head.html
		header.html
		nav.html
public/
	generated site output
```

`public/` is generated and ignored by Git.

## Front Matter

Each content file starts with YAML front matter:

```yaml
---
title: "Orthodox Zone"
description: "An Orthodox Christian hub for Britain, Scotland, and the wider English-speaking world."
slug: "/"
nav: "home"
template: "page"
extra_css: []
extra_scripts: []
aliases:
  - "/index.html"
draft: false
canonical: ""
---
```

Fields:

| Field         | Purpose                                         |
|---------------|-------------------------------------------------|
| title         | Page title and OpenGraph title                  |
| description   | Meta description and OpenGraph description      |
| slug          | Clean output URL                                |
| nav           | Current navigation key                          |
| template      | Template name, currently `page`                 |
| extra_css     | Extra stylesheet URLs                           |
| extra_scripts | Extra script URLs                               |
| aliases       | Extra output paths for old URLs                 |
| draft         | Exclude page from output when true              |
| canonical     | Optional canonical URL override                 |

Markdown can include raw HTML blocks for richer sections such as cards, hero areas, and the calendar shell.

## Clean URLs

The generator writes directory-style output:

```text
/                  -> public/index.html
/about/            -> public/about/index.html
/projects/         -> public/projects/index.html
/projects/connect/ -> public/projects/connect/index.html
/projects/calendar/-> public/projects/calendar/index.html
/resources/        -> public/resources/index.html
/saints/           -> public/saints/index.html
/contact/          -> public/contact/index.html
```

Old flat URLs are generated as compatibility aliases, including `connect.html`, `orthocal.html`, `calendar.html`, `resources.html`, `saints.html`, `about.html`, and `contact.html`.

## Calendar Page

`content/projects/calendar.md` builds the Orthocal calendar page. It uses `assets/js/calendar.js`, which fetches `/orthocal-api/...` on the same origin.

Run Orthocal locally on the server:

```sh
orthocal serve --db ./orthodox-calendar.db --addr 127.0.0.1:8080
```

Example nginx location:

```nginx
location /orthocal-api/ {
	proxy_pass http://127.0.0.1:8080/api/;
	proxy_http_version 1.1;
	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
}
```

The deployment script does not modify nginx. Configure the proxy manually in the existing nginx site config.

## Deployment

On the current Debian server, the intended target is:

```text
/var/www/orthodox.zone/html
```

Clone the repository on the server:

```sh
git clone https://github.com/TheHolyLoch/orthodox.zone-web.git
cd orthodox.zone-web
```

Check the source layout, Go, target directory, write access, and rsync availability:

```sh
./scripts/deploy.sh --check
```

Preview the deployment:

```sh
./scripts/deploy.sh --dry-run
```

Deploy:

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
