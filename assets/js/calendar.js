// Orthodox Zone - Developed by dgm (dgm@tuta.com)
// orthodox.zone-web/assets/js/calendar.js

const apiBase = window.ORTHOCAL_API_BASE || '/orthocal-api';
const apiRoot = apiBase.replace(/\/$/, '');

const elements = {
	controls: document.querySelector('#calendar-controls'),
	dateInput: document.querySelector('#calendar-date'),
	prevButton: document.querySelector('#calendar-prev'),
	todayButton: document.querySelector('#calendar-today'),
	nextButton: document.querySelector('#calendar-next'),
	loading: document.querySelector('#calendar-loading'),
	error: document.querySelector('#calendar-error'),
	empty: document.querySelector('#calendar-empty'),
	day: document.querySelector('#calendar-day'),
	dayTitle: document.querySelector('#calendar-day-title'),
	meta: document.querySelector('#calendar-meta'),
	sections: document.querySelector('#calendar-sections'),
	apiStatus: document.querySelector('#calendar-api-status')
};

function toIsoDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

function selectedDate() {
	if (!elements.dateInput.value) {
		return new Date();
	}

	return new Date(`${elements.dateInput.value}T12:00:00`);
}

function shiftSelectedDate(days) {
	const date = selectedDate();
	date.setDate(date.getDate() + days);
	elements.dateInput.value = toIsoDate(date);
}

async function fetchJson(path) {
	const response = await fetch(`${apiRoot}${path}`, {
		headers: {
			'Accept': 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Orthocal API returned ${response.status}`);
	}

	return response.json();
}

function isObject(value) {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
	return value !== undefined && value !== null && String(value).trim() !== '';
}

function hasItems(value) {
	return Array.isArray(value) && value.length > 0;
}

function clearNode(node) {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
}

function normaliseText(value) {
	return hasText(value) ? String(value).trim() : '';
}

function sortByOrder(items, key) {
	return [...items].sort((a, b) => {
		const first = Number(a[key] || 0);
		const second = Number(b[key] || 0);
		return first - second;
	});
}

function extractTone(headerText) {
	const match = normaliseText(headerText).match(/\bTone\s+([^.]*)/i);
	return match ? `Tone ${match[1].trim()}` : '';
}

function appendMeta(label, value) {
	const text = normaliseText(value);
	if (!text) {
		return;
	}

	const term = document.createElement('dt');
	const detail = document.createElement('dd');
	term.textContent = label;
	detail.textContent = text;
	elements.meta.append(term, detail);
}

function appendParagraph(parent, text) {
	const value = normaliseText(text);
	if (!value) {
		return;
	}

	const paragraph = document.createElement('p');
	paragraph.textContent = value;
	parent.appendChild(paragraph);
}

function appendTag(parent, text) {
	const tag = document.createElement('span');
	tag.className = 'calendar-tag';
	tag.textContent = text;
	parent.appendChild(tag);
}

function createCard(title) {
	const card = document.createElement('article');
	const heading = document.createElement('h3');
	const body = document.createElement('div');
	card.className = 'calendar-card';
	heading.className = 'calendar-card-title';
	heading.textContent = title;
	card.append(heading, body);

	return { card, body };
}

function appendStringList(parent, values) {
	const filtered = values.map(normaliseText).filter(Boolean);
	if (!filtered.length) {
		return false;
	}

	const list = document.createElement('ul');
	list.className = 'calendar-list';

	for (const value of filtered) {
		const item = document.createElement('li');
		item.textContent = value;
		list.appendChild(item);
	}

	parent.appendChild(list);
	return true;
}

function eventText(event) {
	if (!isObject(event)) {
		return normaliseText(event);
	}

	return normaliseText(
		event.title ||
		event.name ||
		event.summary ||
		event.description ||
		event.text
	);
}

function renderEvents(title, dayText, eventArrays) {
	const values = [];

	if (hasText(dayText)) {
		values.push(dayText);
	}

	for (const events of eventArrays) {
		if (!hasItems(events)) {
			continue;
		}

		for (const event of events) {
			const text = eventText(event);
			if (text) {
				values.push(text);
			}
		}
	}

	if (!values.length) {
		return null;
	}

	const { card, body } = createCard(title);
	appendStringList(body, values);
	return card;
}

function saintList(data) {
	const saints = hasItems(data.saints)
		? data.saints
		: [
			...(data.primary_saints || []),
			...(data.western_saints || [])
		];

	return [...saints].sort((left, right) => {
		const leftPriority = left.is_primary ? 0 : left.is_western ? 1 : 2;
		const rightPriority = right.is_primary ? 0 : right.is_western ? 1 : 2;

		if (leftPriority !== rightPriority) {
			return leftPriority - rightPriority;
		}

		const leftOrder = Number(left.saint_order || 0);
		const rightOrder = Number(right.saint_order || 0);
		return leftOrder - rightOrder;
	});
}

function renderSaints(data) {
	const saints = saintList(data);
	if (!saints.length) {
		return null;
	}

	const { card, body } = createCard('Saints and commemorations');
	const list = document.createElement('ol');
	list.className = 'calendar-list';

	for (const saint of saints) {
		if (!hasText(saint.name)) {
			continue;
		}

		const item = document.createElement('li');
		const name = document.createElement('span');
		const tags = document.createElement('span');
		name.textContent = saint.name;
		tags.className = 'calendar-tags';
		item.appendChild(name);

		if (saint.is_primary) {
			appendTag(tags, 'primary');
		}

		if (saint.is_western) {
			appendTag(tags, 'western');
			appendTag(tags, 'Britain and Ireland');
		}

		if (hasText(saint.service_rank_name)) {
			// appendTag(tags, saint.service_rank_name);
		}

		if (tags.children.length) {
			item.appendChild(tags);
		}

		list.appendChild(item);
	}

	if (!list.children.length) {
		return null;
	}

	body.appendChild(list);
	return card;
}

function safeUrl(value) {
	if (!hasText(value)) {
		return '';
	}

	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
	} catch (error) {
		return '';
	}
}

function renderReadings(data) {
	if (!hasItems(data.scripture_readings)) {
		return null;
	}

	const readings = sortByOrder(data.scripture_readings, 'reading_order');
	const { card, body } = createCard('Readings');
	const list = document.createElement('ul');
	list.className = 'calendar-list';

	for (const reading of readings) {
		const text = normaliseText(reading.display_text || reading.verse_reference);
		if (!text) {
			continue;
		}

		const item = document.createElement('li');
		const url = safeUrl(reading.reading_url);

		if (url) {
			const link = document.createElement('a');
			link.href = url;
			link.rel = 'noopener noreferrer';
			link.textContent = text;
			item.appendChild(link);
		} else {
			item.textContent = text;
		}

		if (hasText(reading.description)) {
			const description = document.createElement('span');
			description.textContent = ` - ${reading.description}`;
			item.appendChild(description);
		}

		list.appendChild(item);
	}

	if (!list.children.length) {
		return null;
	}

	body.appendChild(list);
	return card;
}

function renderFasting(day, data) {
	const values = new Set();

	if (hasText(day.fasting_rule)) {
		values.add(normaliseText(day.fasting_rule));
	}

	if (hasText(day.fasting_level_name)) {
		values.add(normaliseText(day.fasting_level_name));
	}

	if (hasText(day.fasting_level_description)) {
		values.add(normaliseText(day.fasting_level_description));
	}

	return renderEvents('Fasting', [...values].join(' '), []);
}

function renderHymns(data) {
	const hymns = data.hymns || data.hymn_count || data.hymnCount;
	if (!hasItems(hymns) && !hasText(hymns)) {
		return null;
	}

	const { card, body } = createCard('Hymns');

	if (Array.isArray(hymns)) {
		appendStringList(body, hymns.map(eventText));
	} else {
		appendParagraph(body, `${hymns} hymns available.`);
	}

	return card;
}

function renderCalendar(data, dateValue) {
	const day = isObject(data.day) ? data.day : {};
	const title = normaliseText(day.dataheader) || normaliseText(day.gregorian_date) || dateValue;
	const tone = normaliseText(day.tone) || extractTone(day.headerheader);
	const fasting = normaliseText(day.fasting_rule || day.fasting_level_name);
	const cards = [
		renderEvents('Feasts and events', day.feasts, [data.feast_events, data.events]),
		renderSaints(data),
		renderReadings(data),
		renderHymns(data),
		renderFasting(day, data),
		renderEvents('Remembrance', day.remembrances, [data.remembrance_events]),
		renderEvents('Fasting season', day.fasts, [data.fast_events]),
		renderEvents('Fast-free period', day.fast_free_periods, [data.fast_free_events])
	].filter(Boolean);

	clearNode(elements.meta);
	clearNode(elements.sections);
	elements.error.hidden = true;
	elements.empty.hidden = true;
	elements.day.hidden = false;
	elements.dayTitle.textContent = title;

//	appendMeta('Gregorian date', day.gregorian_date);
//	appendMeta('Orthodox / Julian date', day.julian_date);
//	appendMeta('Day name', day.gregorian_weekday);
//	appendMeta('Tone', tone);
	appendMeta('Fasting', fasting);
	appendMeta('Summary', day.headerheader);

	for (const card of cards) {
		elements.sections.appendChild(card);
	}

	if (!cards.length && elements.meta.children.length === 0) {
		elements.empty.hidden = false;
	}
}

function setLoading(isLoading) {
	elements.loading.hidden = !isLoading;
}

function showError(message) {
	elements.error.hidden = false;
	elements.error.textContent = `${message} Check that Orthocal is running locally and nginx is proxying /orthocal-api/ to the Orthocal API.`;
}

async function loadDate(dateValue) {
	setLoading(true);
	elements.error.hidden = true;
	elements.empty.hidden = true;

	try {
		const data = await fetchJson(`/date/${dateValue}`);
		renderCalendar(data, dateValue);
	} catch (error) {
		elements.day.hidden = true;
		clearNode(elements.sections);
		showError(error.message || 'The Orthocal API could not be reached.');
	} finally {
		setLoading(false);
	}
}

async function loadApiInfo() {
	try {
		const info = await fetchJson('/info');
		const label = normaliseText(info.version || info.name || info.title);
		elements.apiStatus.textContent = label ? `Orthocal API available: ${label}` : 'Orthocal API available.';
	} catch (error) {
		elements.apiStatus.textContent = 'Orthocal API status unavailable.';
	}
}

function bindEvents() {
	elements.controls.addEventListener('submit', (event) => {
		event.preventDefault();
		loadDate(elements.dateInput.value);
	});

	elements.prevButton.addEventListener('click', () => {
		shiftSelectedDate(-1);
		loadDate(elements.dateInput.value);
	});

	elements.todayButton.addEventListener('click', () => {
		elements.dateInput.value = toIsoDate(new Date());
		loadDate(elements.dateInput.value);
	});

	elements.nextButton.addEventListener('click', () => {
		shiftSelectedDate(1);
		loadDate(elements.dateInput.value);
	});
}

function initCalendar() {
	if (!elements.controls || !elements.dateInput) {
		return;
	}

	elements.dateInput.value = toIsoDate(new Date());
	bindEvents();
	loadDate(elements.dateInput.value);
	loadApiInfo();
}

initCalendar();
