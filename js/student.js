/* Modo estudiante: paginacion, validacion de obligatorias y revision final. */

const Student = (() => {

    function renderHeader() {
        return `
            <header class="card formHeader">
                <div class="headerColorBar"></div>
                <h1 class="formTitle">${esc(state.title) || 'Formulario sin título'}</h1>
                ${state.description ? `<p class="formDescription">${esc(state.description)}</p>` : ''}
            </header>`;
    }

    function renderProgress() {
        const total = state.questions.length;
        if (!total) return '';
        const done = state.page * PAGE_SIZE + 1;
        const percent = Math.round((done / total) * 100);
        return `
            <div class="progressWrapper">
                <div class="progressBar"><div class="progressFill" style="width:${percent}%"></div></div>
                <span class="progressText">Pregunta ${done} de ${total}</span>
            </div>`;
    }

    function renderAnswerArea(question) {
        if (question.type === 'multiple') {
            return `<div class="optionContainer">${question.options.map((option) => `
                <div class="optionRow selectable ${state.answers[question.id] === option.id ? 'selected' : ''}"
                     data-option="${option.id}">
                    <div class="radioCircle"></div>
                    <span class="optionText">${esc(option.text) || '<span class="placeholderText">Opción sin texto</span>'}</span>
                </div>`).join('')}</div>`;
        }

        if (question.type === 'corto') {
            return `
                <div class="optionContainer">
                    <div class="optionRow">
                        <input type="text" class="optionInput answerInput" data-answer="${question.id}"
                               placeholder="Tu respuesta" value="${esc(state.answers[question.id] || '')}">
                    </div>
                </div>`;
        }

        return `
            <div class="optionContainer">
                <div class="optionRow">
                    <textarea class="optionInput answerTextarea" data-answer="${question.id}"
                              placeholder="Tu respuesta">${esc(state.answers[question.id] || '')}</textarea>
                </div>
            </div>`;
    }

    function renderQuestion(question, index) {
        const invalid = state.invalid.has(question.id);
        return `
            <section class="card questionCard ${invalid ? 'invalid' : ''}" data-id="${question.id}">
                <div class="questionHeader">
                    <span class="questionNumber">${index + 1}</span>
                    <h2 class="questionTitleStatic">${esc(question.title) || 'Pregunta sin título'}</h2>
                    <span class="requiredBadge">Obligatoria</span>
                </div>
                ${renderAnswerArea(question)}
                ${invalid ? '<p class="errorMessage">Esta pregunta es obligatoria.</p>' : ''}
            </section>`;
    }

    function renderNav() {
        const isLast = state.page >= totalPages() - 1;
        return `
            <div class="navButtons">
                <button type="button" class="btn btnGhost" data-nav="prev" ${state.page === 0 ? 'disabled' : ''}>
                    Anterior
                </button>
                <button type="button" class="btn btnPrimary" data-nav="${isLast ? 'submit' : 'next'}">
                    ${isLast ? 'Revisar respuestas' : 'Siguiente'}
                </button>
            </div>`;
    }

    function render() {
        if (!state.questions.length) {
            return `${renderHeader()}<div class="card emptyState"><p>No hay preguntas para responder.</p></div>`;
        }
        return renderHeader() + renderProgress() + renderQuestion(questionsOfPage()[0], state.page * PAGE_SIZE) + renderNav();
    }

    /* ---------- revision ---------- */

    function renderReview() {
        const rows = state.questions.map((question, index) => `
            <div class="reviewRow">
                <span class="reviewNumber">${index + 1}</span>
                <div class="reviewBody">
                    <p class="reviewQuestion">${esc(question.title) || 'Pregunta sin título'}</p>
                    <p class="reviewAnswer">${esc(answerOf(question)) || '<em>Sin responder</em>'}</p>
                </div>
            </div>`).join('');

        return `
            ${renderHeader()}
            <div class="card">
                <h2 class="reviewTitle">Revisa tus respuestas</h2>
                ${rows}
                <div class="navButtons">
                    <button type="button" class="btn btnGhost" data-nav="back">Volver a editar</button>
                    <button type="button" class="btn btnPrimary" data-nav="confirm">Enviar</button>
                </div>
            </div>`;
    }

    function renderDone() {
        return `
            ${renderHeader()}
            <div class="card doneCard">
                <div class="doneIcon">✓</div>
                <h2 class="reviewTitle">Respuestas enviadas</h2>
                <p class="doneText">Se registraron ${state.questions.length} respuestas para "${esc(state.title)}".</p>
                <div class="navButtons center">
                    <button type="button" class="btn btnPrimary" data-nav="restart">Intentar de nuevo</button>
                </div>
            </div>`;
    }

    function renderCurrent() {
        if (state.view === 'review') return renderReview();
        if (state.view === 'done') return renderDone();
        return render();
    }

    /* ---------- eventos ---------- */

    function onClick(event) {
        const nav = event.target.closest('[data-nav]');
        if (nav) return handleNav(nav.dataset.nav);

        const row = event.target.closest('.optionRow.selectable');
        if (row) {
            const question = getQuestion(row.closest('.questionCard').dataset.id);
            state.answers[question.id] = row.dataset.option;
            state.invalid.delete(question.id);
            App.render();
        }
    }

    function onInput(event) {
        const questionId = event.target.dataset.answer;
        if (!questionId) return;
        state.answers[questionId] = event.target.value;
    }

    function handleNav(action) {
        switch (action) {
            case 'prev':
                state.page = Math.max(0, state.page - 1);
                App.render();
                break;
            case 'next':
                if (!validatePage()) return;
                state.page = Math.min(totalPages() - 1, state.page + 1);
                App.render();
                break;
            case 'submit':
                if (!validateAll()) return;
                state.view = 'review';
                App.render();
                break;
            case 'back':
                state.view = 'student';
                App.render();
                break;
            case 'confirm':
                state.view = 'done';
                App.render();
                break;
            case 'restart':
                state.answers = {};
                state.invalid = new Set();
                state.page = 0;
                state.view = 'student';
                App.render();
                break;
        }
    }

    function validatePage() {
        const pageQuestions = questionsOfPage();
        const missing = pageQuestions.filter((q) => !isAnswered(q));
        missing.forEach((q) => state.invalid.add(q.id));
        if (!missing.length) return true;

        App.render();
        const first = document.querySelector('.questionCard.invalid');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    function validateAll() {
        state.invalid = new Set(state.questions.filter((q) => !isAnswered(q)).map((q) => q.id));
        if (!state.invalid.size) return true;

        // saltar a la primera pagina con errores
        const firstInvalid = state.questions.findIndex((q) => state.invalid.has(q.id));
        state.page = Math.floor(firstInvalid / PAGE_SIZE);
        state.view = 'student';
        App.render();
        const first = document.querySelector('.questionCard.invalid');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    return { render: renderCurrent, onClick, onInput, validatePage, validateAll };
})();
