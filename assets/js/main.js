// Orthodox Zone - Developed by dgm (dgm@tuta.com)
// orthodox.zone-web/assets/js/main.js

const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector("#primary-nav");

function setNavState(isOpen) {
	navToggle.setAttribute("aria-expanded", String(isOpen));
	primaryNav.dataset.open = String(isOpen);
	document.body.classList.toggle("nav-open", isOpen);
}

if (navToggle && primaryNav) {
	navToggle.addEventListener("click", () => {
		const isOpen = navToggle.getAttribute("aria-expanded") === "true";
		setNavState(!isOpen);
	});

	primaryNav.addEventListener("click", (event) => {
		if (event.target instanceof HTMLAnchorElement) {
			setNavState(false);
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			setNavState(false);
			navToggle.focus();
		}
	});
}
