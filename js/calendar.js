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
      const counts = getSessionCountByDate(loadSessions());
      const value = formatDate(dayElem.dateObj);
      const count = counts[value] || 0;

      if (count === 1) dayElem.classList.add('has-session', 'heat-1');
      if (count === 2) dayElem.classList.add('has-session', 'heat-2');
      if (count >= 3) dayElem.classList.add('has-session', 'heat-3');
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
