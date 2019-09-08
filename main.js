(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

document.addEventListener('DOMContentLoaded', function() {
    init();
});

var input, inputMax, danger, btn,
    form,
    isXHRloading = false;

var progressBar, progressPercent, progressTimer,
    progressPercentStart = 3,
    lastRafLabel;

var highlightTitle = 'Торговое наименование';

function init() {
    btn = document.querySelector('.success-btn');
    input = document.querySelector('.input-text'),
    inputMax = document.querySelector('.input-max-count'),
    danger = document.querySelector('.danger-text');
    form = document.querySelector('.form');
    result = document.querySelector('.result');
    progressBar = document.querySelector('.progress-bar');
    
    btn.onclick = onButtonClick;
    form.onsubmit = onFormSubmit;

    input.addEventListener('keydown', onKeyDown);
    inputMax.addEventListener('keydown', onKeyDown);
    input.focus();
}

function onKeyDown(e) {
    // 13 = enter
    if (e.keyCode === 13) {
        onButtonClick();
    }
}

function onFormSubmit() {
    return false;
}

function removeTable() {
    var table = result.querySelectorAll('.table');

    if (table.length) {
        for (var i = 0; i < table.length; i++) {
            table[i].remove();
        }
    }
}

function disableButton() {
    btn.setAttribute('disabled', true);
}

function enableButton() {
    btn.removeAttribute('disabled', true);
}

function onButtonClick() {
    if (isXHRloading) return;

    var text = input.value;

    if (!text.length) {
        return input.focus();                
    }

    progressBarStart();
    removeError();
    removeTable();
    disableButton();
    sendAjax(text);
}

function progressBarStart() {
    progressBar.classList.remove('progress-bar_hidden');
    progressPercent = progressPercentStart;

    progressAnimate();
}

function progressBarStop() {
    progressBar.classList.add('progress-bar_hidden');
    progressPercent = progressPercentStart;
    progressBar.style.width = `${progressPercent}%`;
    cancelAnimationFrame(progressTimer);
}

function progressAnimate(time) {
    if (!lastRafLabel) {
        lastRafLabel = time;
    }

    var difference = time - lastRafLabel;

    if (progressPercent <= 100) {
        progressTimer = requestAnimationFrame(progressAnimate);
    }

    if (difference > 50) {
        lastRafLabel = time;
        progressPercent++;
        progressBar.style.width = `${progressPercent}%`;
    }
}

function sendAjax() {
    isXHRloading = true;

    $.ajax({
        url: "https://drug-parser.herokuapp.com",
        method: "GET",
        crossDomain: true,
        dataType: "json",
        data: {
            name: input.value,
            pageSize: inputMax.value || 10,
        }
    }).done(function(result) {
        if (result.error) {
            setError(result.error);
        } else if (result.response) {
            setTableResults(result.response);
        }
    }).fail(function(jqXHR, textStatus) {
        setError("Request failed: " + textStatus);
    }).always(function() {
        enableButton();
        isXHRloading = false;
        progressBarStop();
    });
}

function setError(errorText) {
    danger.classList.add('danger-text_visible');
    danger.innerHTML = errorText;
}

function removeError() {
    danger.classList.remove('danger-text_visible');
    danger.innerHTML = '';
}

function setTableResults(response) {
    if (!response.length) {
        return setError('Недостаточно информации в ответе.');
    }

    var table = document.createElement('table');
    table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered');

    setHeaderTable(table, response[0]);
    setHeaderRows(table, response);
}

function setHeaderRows(table, response) {
    var tbody = document.createElement('tbody'),
        tr,
        colNumbers = 0;

    response.forEach(function(cols, indexOuter) {
        tr = document.createElement('tr');

        cols.forEach(function(col, index) {
            var isFirstItem = index === 0,
            item = isFirstItem ?
                document.createElement('th') :
                document.createElement('td');

            // нужно посчитать один раз
            if (indexOuter === 0) {
                colNumbers++;
            }

            if (isFirstItem) {
                item.setAttribute('scope', 'row');
            }

            var value = col.value;

            // подсвечиваем совпавшую часть
            if (col.name === highlightTitle) {
                var regexp = new RegExp('(' + input.value + ')', 'i');

                value = value.replace(regexp, '<span class="highlight">$1</span>');
            }

            item.innerHTML = value;
            tr.appendChild(item);
        })

        tbody.appendChild(tr);
    });

    var lastCopyRow = document.createElement('tr'),
        td = document.createElement('td');

    td.innerHTML = 'Поиск осуществляется в <a target="_blank" href="//grls.rosminzdrav.ru">Едином Государственном реестре предельных отпускных цен</a>.';
    td.setAttribute('colspan', colNumbers);
    td.classList.add('td-copy')
    lastCopyRow.appendChild(td);

    tbody.appendChild(lastCopyRow);

    table.appendChild(tbody);
    result.appendChild(table);
}

function setHeaderTable(table, row) {
    var thead = document.createElement('thead'),
        tr = document.createElement('tr'),
        th;

    row.forEach(function(item) {
        th = document.createElement('th');
        th.innerHTML = item.name;
        th.setAttribute('scope', 'col');
        tr.appendChild(th);
    })

    thead.appendChild(tr);
    table.appendChild(thead);
}
