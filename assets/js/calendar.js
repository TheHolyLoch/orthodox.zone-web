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

function hasContent(value) {
	if (Array.isArray(value)) {
		return value.length > 0;
	}

	if (isObject(value)) {
		return Object.keys(value).length > 0;
	}

	return value !== undefined && value !== null && String(value).trim() !== '';
}

function titleCaseKey(key) {
	return key
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findFirstValue(source, keys) {
	if (!isObject(source) && !Array.isArray(source)) {
		return null;
	}

	if (isObject(source)) {
		for (const key of keys) {
			if (hasContent(source[key])) {
				return source[key];
			}
		}

		for (const value of Object.values(source)) {
			const found = findFirstValue(value, keys);
			if (hasContent(found)) {
				return found;
			}
		}
	}

	if (Array.isArray(source)) {
		for (const value of source) {
			const found = findFirstValue(value, keys);
			if (hasContent(found)) {
				return found;
			}
		}
	}

	return null;
}

function normaliseDay(data, dateValue) {
	return {
		date: findFirstValue(data, ['gregorian_date', 'gregorianDate', 'date', 'iso_date']) || dateValue,
		julianDate: findFirstValue(data, ['julian_date', 'julianDate', 'orthodox_date', 'orthodoxDate']),
		dayName: findFirstValue(data, ['day_name', 'dayName', 'weekday']),
		tone: findFirstValue(data, ['tone']),
		fasting: findFirstValue(data, ['fasting_note', 'fastingNote', 'fasting_rule', 'fastingRule', 'fasting', 'fast_level', 'fastLevel']),
		summary: findFirstValue(data, ['summary', 'title', 'description', 'event_summary', 'eventSummary']),
		feasts: findFirstValue(data, ['feasts', 'events', 'feast_days', 'feastDays']),
		saints: findFirstValue(data, ['saints', 'commemorations', 'remembrances']),
		readings: findFirstValue(data, ['readings', 'scripture_readings', 'scriptureReadings']),
		hymns: findFirstValue(data, ['hymns']),
		notes: findFirstValue(data, ['notes', 'note', 'details']),
		raw: data
	};
}

async function mergeSupplementalData(model, dateValue) {
	const endpoints = [
		['saints', `/saints/${dateValue}`],
		['readings', `/readings/${dateValue}`],
		['hymns', `/hymns/${dateValue}`]
	];

	for (const [key, path] of endpoints) {
		if (hasContent(model[key])) {
			continue;
		}

		try {
			model[key] = await fetchJson(path);
		} catch (error) {
			console.warn(`Could not load ${key}`, error);
		}
	}

	return model;
}

function clearNode(node) {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
}

function appendText(parent, text) {
	parent.appendChild(document.createTextNode(String(text)));
}

function appendMeta(label, value) {
	if (!hasContent(value)) {
		return;
	}

	const term = document.createElement('dt');
	const detail = document.createElement('dd');
	term.textContent = label;
	detail.textContent = valueToText(value);
	elements.meta.append(term, detail);
}

function valueToText(value) {
	if (Array.isArray(value)) {
		return value.map(valueToText).filter(Boolean).join(', ');
	}

	if (isObject(value)) {
		const preferred = ['title', 'name', 'summary', 'text', 'reference', 'description'];
		for (const key of preferred) {
			if (hasContent(value[key])) {
				return valueToText(value[key]);
			}
		}

		return Object.entries(value)
			.filter(([, entryValue]) => hasContent(entryValue))
			.map(([key, entryValue]) => `${titleCaseKey(key)}: ${valueToText(entryValue)}`)
			.join('; ');
	}

	return value === null || value === undefined ? '' : String(value);
}

function renderValue(parent, value) {
	if (Array.isArray(value)) {
		const list = document.createElement('ul');
		list.className = 'calendar-list';

		for (const item of value) {
			const listItem = document.createElement('li');
			renderValue(listItem, item);
			list.appendChild(listItem);
		}

		parent.appendChild(list);
		return;
	}

	if (isObject(value)) {
		const usefulKeys = ['title', 'name', 'summary', 'text', 'reference', 'source', 'type', 'rank', 'description'];
		const list = document.createElement('dl');
		list.className = 'calendar-list calendar-detail-list';
		let rendered = false;

		for (const key of usefulKeys) {
			if (!hasContent(value[key])) {
				continue;
			}

			const term = document.createElement('dt');
			const detail = document.createElement('dd');
			term.textContent = titleCaseKey(key);
			detail.textContent = valueToText(value[key]);
			list.append(term, detail);
			rendered = true;
		}

		if (!rendered) {
			for (const [key, entryValue] of Object.entries(value)) {
				if (!hasContent(entryValue)) {
					continue;
				}

				const term = document.createElement('dt');
				const detail = document.createElement('dd');
				term.textContent = titleCaseKey(key);
				renderValue(detail, entryValue);
				list.append(term, detail);
				rendered = true;
			}
		}

		if (rendered) {
			parent.appendChild(list);
		}
		return;
	}

	appendText(parent, value);
}

function createCard(title, value) {
	if (!hasContent(value)) {
		return null;
	}

	const card = document.createElement('article');
	const heading = document.createElement('h3');
	const body = document.createElement('div');
	card.className = 'calendar-card';
	heading.className = 'calendar-card-title';
	heading.textContent = title;
	card.appendChild(heading);
	renderValue(body, value);
	card.appendChild(body);

	return card;
}

function renderRawFallback(raw) {
	const card = document.createElement('article');
	const heading = document.createElement('h3');
	const pre = document.createElement('pre');
	card.className = 'calendar-card';
	heading.className = 'calendar-card-title';
	heading.textContent = 'Notes / raw detail fallback';
	pre.textContent = JSON.stringify(raw, null, 2);
	card.append(heading, pre);

	return card;
}

function renderCalendar(model) {
	clearNode(elements.meta);
	clearNode(elements.sections);
	elements.error.hidden = true;
	elements.day.hidden = false;
	elements.empty.hidden = true;

	elements.dayTitle.textContent = valueToText(model.date) || 'Calendar day';
	appendMeta('Gregorian date', model.date);
	appendMeta('Orthodox / Julian date', model.julianDate);
	appendMeta('Day name', model.dayName);
	appendMeta('Tone', model.tone);
	appendMeta('Fasting', model.fasting);
	appendMeta('Summary', model.summary);

	const cards = [
		createCard('Feasts and events', model.feasts),
		createCard('Saints and commemorations', model.saints),
		createCard('Readings', model.readings),
		createCard('Hymns', model.hymns),
		createCard('Fasting', model.fasting),
		createCard('Notes / raw detail fallback', model.notes)
	].filter(Boolean);

	if (cards.length === 0 && hasContent(model.raw)) {
		cards.push(renderRawFallback(model.raw));
	}

	for (const card of cards) {
		elements.sections.appendChild(card);
	}

	if (cards.length === 0 && elements.meta.children.length === 0) {
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
		const model = normaliseDay(data, dateValue);
		await mergeSupplementalData(model, dateValue);
		renderCalendar(model);
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
		const label = valueToText(info.version || info.name || info);
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
