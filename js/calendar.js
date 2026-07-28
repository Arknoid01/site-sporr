let flatpickrInstance = null;

function initCalendar(onDateChange) {
  const input = document.getElementById('calendar-picker');
  if (!input || typeof flatpickr === 'undefined') return;

  flatpickrInstance = flatpickr(input, {
    locale: 'fr',
    inline: true,
    dateFormat: 'Y-m-d',
    defaultDate: todayString(),
    onChange(selectedDates) {
      if (selectedDates.length > 0 && typeof onDateChange === 'function') {
        onDateChange(formatDate(selectedDates[0]));
      }
    },
    onDayCreate(_dObj, _dStr, _fp, dayElem) {
      const activeDates = getActiveDates(loadSessions());
      const value = formatDate(dayElem.dateObj);
      if (activeDates.includes(value)) {
        dayElem.classList.add('has-session');
      }
    }
  });
}

function highlightActiveDays() {
  if (flatpickrInstance) {
    flatpickrInstance.redraw();
  }
}

function setCalendarDate(date) {
  if (flatpickrInstance) {
    flatpickrInstance.setDate(date, true);
  }
}
