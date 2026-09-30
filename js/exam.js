/* Modo Prueba y modo Estudiante.
   Responder y revisar es igual en ambos; lo que cambia es si se valida al
   avanzar, si hay puntaje, y si se puede salir. */

const Exam = (() => {

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
                    <span class="optionText">${esc(option.text) || '<span class="placeholderText">Alternativa sin texto</span>'}</span>
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

    function renderForm() {
        state.page = Math.min(state.page, totalPages() - 1);
        return renderHeader() + renderProgress()
            + renderQuestion(questionsOfPage()[0], state.page * PAGE_SIZE)
            + renderNav();
    }

    /* ---------- pantalla de inicio (solo Estudiante) ---------- */

    function renderStart() {
        const total = state.questions.length;
        const evaluable = state.questions.filter(isEvaluable).length;

        return `
            ${renderHeader()}
            <div class="card startCard">
                <h2 class="reviewTitle">${esc(state.title) || 'Examen'}</h2>
                <ul class="startInfo">
                    <li><strong>${total}</strong> ${total === 1 ? 'pregunta' : 'preguntas'}, todas obligatorias</li>
                    <li><strong>${evaluable}</strong> con puntaje automático · el resto lo corrige el docente</li>
                </ul>

                <div class="startWarning">
                    <p><strong>Lee antes de empezar.</strong></p>
                    <ul>
                        <li>Una vez que envíes tus respuestas no podrás volver atrás.</li>
                        <li>Si cierras o recargas la pestaña, se pierden las respuestas.</li>
                    </ul>
                </div>

                <div class="navButtons center">
                    <button type="button" class="btn btnPrimary" data-nav="begin">Comenzar examen</button>
                </div>
            </div>`;
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

        // En Estudiante no hay vuelta atras: solo se sale enviando.
        const confirmLabel = isLocked() ? 'Enviar' : 'Finalizar prueba';
        const confirmNav = isLocked() ? 'confirm' : 'exit-prueba';

        return `
            ${renderHeader()}
            <div class="card">
                <h2 class="reviewTitle">Revisa tus respuestas</h2>
                ${rows}
                <div class="navButtons">
                    <button type="button" class="btn btnGhost" data-nav="back">Volver a editar</button>
                    <button type="button" class="btn btnPrimary" data-nav="${confirmNav}">${confirmLabel}</button>
                </div>
            </div>`;
    }

    /* ---------- resultado (solo Estudiante) ---------- */

    function renderResultRow(item, index) {
        const number = index + 1;
        const title = esc(item.question.title) || 'Pregunta sin título';

        if (item.pending) {
            const note = item.noKey ? 'Sin clave de corrección' : 'Pendiente de corrección docente';
            return `
                <div class="resultRow">
                    <span class="resultMark pending">–</span>
                    <div class="resultBody">
                        <p class="reviewQuestion">${number}. ${title}</p>
                        <p class="resultNote">${note}</p>
                    </div>
                </div>`;
        }

        const isFull = item.earned >= 1;
        const isPartial = item.earned > 0 && item.earned < 1;
        const mark = isFull ? '✓' : isPartial ? '~' : '✗';
        const tone = isFull ? 'ok' : isPartial ? 'partial' : 'bad';
        const given = answerOf(item.question) || 'Sin responder';

        let credit = `<span class="resultCredit">${formatCredit(item)}</span>`;
        if (item.correctCount > 1) credit += `<span class="resultNote"> (había ${item.correctCount} correctas)</span>`;

        return `
            <div class="resultRow">
                <span class="resultMark ${tone}">${mark}</span>
                <div class="resultBody">
                    <p class="reviewQuestion">${number}. ${title}</p>
                    <p class="reviewAnswer">${esc(given)}</p>
                    ${credit}
                </div>
            </div>`;
    }

    function formatCredit(item) {
        if (item.earned >= 1) return 'Correcta';
        if (item.earned > 0) return `Parcial: ${Math.round(item.earned * 100)}%`;
        return 'Incorrecta';
    }

    function renderResult() {
        const { detail, evaluable, percent } = evaluate();
        const rounded = Math.round(percent);

        const summary = evaluable.length
            ? `${rounded}% · ${Math.round(evaluable.reduce((s, d) => s + d.earned, 0) * 10) / 10} de ${evaluable.length} puntos`
            : 'Sin preguntas con clave de corrección';

        return `
            ${renderHeader()}
            <div class="card">
                <div class="resultHead">
                    <div class="resultScore ${toneOf(rounded)}">${rounded}%</div>
                    <div class="resultSummary">
                        <h2 class="reviewTitle">Resultado</h2>
                        <p class="resultNote">${summary}</p>
                    </div>
                </div>

                ${detail.map(renderResultRow).join('')}

                <div class="navButtons center">
                    <button type="button" class="btn btnPrimary" data-nav="exit-editor">Volver al editor</button>
                </div>
            </div>`;
    }

    function toneOf(percent) {
        if (percent >= 60) return 'ok';
        if (percent >= 30) return 'partial';
        return 'bad';
    }

    /* ---------- dispatcher ---------- */

    function render() {
        if (state.stage === 'start') return renderStart();
        if (state.stage === 'review') return renderReview();
        if (state.stage === 'result') return renderResult();
        return renderForm();
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
            case 'begin':
                state.stage = 'form';
                break;
            case 'prev':
                state.page = Math.max(0, state.page - 1);
                break;
            case 'next':
                if (!validatePage()) return;
                state.page = Math.min(totalPages() - 1, state.page + 1);
                break;
            case 'submit':
                if (!validateAll()) return;
                state.stage = 'review';
                break;
            case 'back':
                state.stage = 'form';
                break;
            case 'confirm':
                state.stage = 'result';
                break;
            case 'exit-prueba':
                App.setMode('editor');
                return;
            case 'exit-editor':
                state.mode = 'editor';
                state.stage = 'form';
                state.invalid = new Set();
                break;
        }
        App.render();
    }

    function validatePage() {
        const missing = questionsOfPage().filter((q) => !isAnswered(q));
        missing.forEach((q) => state.invalid.add(q.id));
        if (!missing.length) return true;

        App.render();
        scrollToInvalid();
        return false;
    }

    function validateAll() {
        state.invalid = new Set(state.questions.filter((q) => !isAnswered(q)).map((q) => q.id));
        if (!state.invalid.size) return true;

        // saltar a la primera pagina con errores
        const firstInvalid = state.questions.findIndex((q) => state.invalid.has(q.id));
        state.page = Math.floor(firstInvalid / PAGE_SIZE);
        state.stage = 'form';
        App.render();
        scrollToInvalid();
        return false;
    }

    function scrollToInvalid() {
        const first = document.querySelector('.questionCard.invalid');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return { render, onClick, onInput, validatePage, validateAll };
})();
