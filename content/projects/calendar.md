---
title: "Orthocal and Orthodox Calendar - Orthodox Zone"
description: "Daily Orthodox calendar information from Orthocal."
slug: "/projects/calendar/"
nav: "calendar"
template: "page"
extra_scripts:
  - "/assets/js/calendar.js"
aliases:
  - "/orthocal.html"
  - "/calendar.html"
---

<section class="page-header celtic-border">
<div class="section">
<p class="eyebrow">Calendar project</p>
<h1>Orthocal and Orthodox Calendar</h1>
<p>Daily Orthodox calendar information from Orthocal.</p>
<p class="calendar-badge">Powered by Orthocal</p>
</div>
</section>

<section class="section two-column">
<div class="readable">
<h2>Overview</h2>
<p>Orthocal provides a foundation for Orthodox calendar access. It is suited to static pages, web frontends, command line use, with JSON/API integrations where structured calendar data is needed.</p>
<p>The project can support fixed feasts, movable feasts, fasts, and days of remembrance. Orthodox Zone uses the Orthocal API through a same-origin nginx proxy at <code>/orthocal-api/</code>.</p>
</div>
<aside class="notice">
<p class="badge">Static page</p>
<p>This page remains static HTML. The daily calendar panel fetches JSON from the proxied Orthocal service when viewed in a browser.</p>
</aside>
</section>

<section class="section calendar-shell">
<div class="calendar-status" id="calendar-api-status" hidden>Checking Orthocal API status...</div>

<form class="calendar-controls" id="calendar-controls">
<button class="button" type="button" id="calendar-prev">Previous day</button>
<button class="button" type="button" id="calendar-today">Today</button>
<button class="button" type="button" id="calendar-next">Next day</button>
<label for="calendar-date"></label>
<input class="calendar-date-input" id="calendar-date" name="date" type="date">
<button class="button button-primary" type="submit">Load</button>
</form>

<div class="calendar-loading" id="calendar-loading" hidden>Loading calendar data...</div>
<div class="calendar-error" id="calendar-error" hidden></div>

<article class="calendar-day" id="calendar-day" hidden>
<div class="calendar-day-heading">
<p class="badge">Selected day</p>
<h2 id="calendar-day-title">Calendar day</h2>
</div>
<dl class="calendar-meta" id="calendar-meta"></dl>
</article>

<div class="calendar-card-grid" id="calendar-sections"></div>

<div class="calendar-empty" id="calendar-empty" hidden>No feasts, saints, readings, or fasting details were found for this date.</div>
</section>

<div class="cross-divider" aria-hidden="true">☦</div>

<section class="section section-muted">
<div class="section-heading">
<p class="eyebrow">Calendar data</p>
<h2>Structured calendar material for public and liturgical use.</h2>
</div>
<div class="card-grid">
<article class="feature-card">
<h3>Fixed feasts</h3>
<p>Calendar entries tied to fixed dates.</p>
</article>
<article class="feature-card">
<h3>Movable feasts</h3>
<p>Calendar entries that depend on the liturgical year.</p>
</article>
<article class="feature-card">
<h3>Fasts</h3>
<p>Structured fasting period and fasting rule data where available.</p>
</article>
<article class="feature-card">
<h3>Days of remembrance</h3>
<p>Remembrances that can be surfaced in calendar views and API output.</p>
</article>
</div>
</section>

<section class="section two-column">
<div class="readable">
<h2>API and web use</h2>
<p>Orthocal can support JSON/API use and web frontend use. That makes it suitable for simple static pages, server-rendered views, or other tools that need predictable calendar data.</p>
<h2>Repository</h2>
<p><a class="button button-primary" href="https://github.com/TheHolyLoch/orthocal">View Orthocal on GitHub</a></p>
</div>
<aside class="resource-list">
<p class="badge">Calendar areas</p>
<ul>
<li>Fixed feasts</li>
<li>Movable feasts</li>
<li>Fasts</li>
<li>Days of remembrance</li>
<li>JSON/API use</li>
<li>Web frontend use</li>
</ul>
</aside>
</section>

<section class="section section-muted">
<div class="readable">
<h2>Future integration with Orthodox Zone</h2>
<p>Orthodox Zone can later use Orthocal for public calendar pages, resource links by season, and simple views for days, feasts, fasts, and remembrances.</p>
</div>
</section>
