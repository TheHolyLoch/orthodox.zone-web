document.addEventListener("DOMContentLoaded", function () {
	var picker = document.querySelector("[data-date-picker]");
	if (!picker) {
		return;
	}

	picker.addEventListener("change", function () {
		if (picker.value) {
			window.location.href = "/date/" + picker.value;
		}
	});
});
