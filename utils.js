
let priorities = {
    'PRIMARY': 0,
    'SECONDARY': 1,
    'SUCCESS': 2,
    'DANGER': 3,
    'WARNING': 4,
    'INFO': 5,
    'LIGHT': 6,
    'DARK': 7
}

/**
     * Shows an alert for a specified amount of time
     * @param {string} message - The message to show in the alert box
     * @param {number} time - The time before hiding the alert
     * @param {object} element - Alert element passed into function
     * @param {number} priorityLevel - Level of priority to assign to alert
     */
function show_alert(message, time, element, priorityLevel) {
    switch (priorityLevel) {
        case priorities.PRIMARY:
            $(element).html(message);
            $(element).addClass('show alert-primary');
            setTimeout(function () { $(element).removeClass('show alert-primary') }, time);
            break;
        case priorities.SECONDARY:
            $(element).html(message);
            $(element).addClass('show alert-secondary');
            setTimeout(function () { $(element).removeClass('show alert-secondary') }, time);
            break;
        case priorities.SUCCESS:
            $(element).html(message);
            $(element).addClass('show alert-success');
            setTimeout(function () { $(element).removeClass('show alert-success') }, time);
            break;
        case priorities.DANGER:
            $(element).html(message);
            $(element).addClass('show alert-danger');
            setTimeout(function () { $(element).removeClass('show alert-danger') }, time);
            break;
        case priorities.WARNING:
            $(element).html(message);
            $(element).addClass('show alert-warning');
            setTimeout(function () { $(element).removeClass('show alert-warning') }, time);
            break;
        case priorities.INFO:
            $(element).html(message);
            $(element).addClass('show alert-info');
            setTimeout(function () { $(element).removeClass('show alert-info') }, time);
            break;
        case priorities.DARK:
            $(element).html(message);
            $(element).addClass('show alert-dark');
            setTimeout(function () { $(element).removeClass('show alert-dark') }, time);
    }
}
