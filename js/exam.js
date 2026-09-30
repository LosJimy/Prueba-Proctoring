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

    /* ---------- barra de progreso ---------- */

    /* La barra mide respuestas, no posicion: con PAGE_SIZE=1, "en que pagina
       estoy" daba 25% lleno en la primera pregunta sin haber contestado nada,
       y al navegar hacia atras la barra retrocedia. El texto conserva la
       posicion, que si es informacion util. */
    function progressModel() {
        const total = state.questions.length;
        const answered = state.questions.filter(isAnswered).length;

        return {
            total,
            answered,
            current: state.page * PAGE_SIZE + 1,
            percent: total ? Math.round((answered / total) * 100) : 0
        };
    }

    function progressText(m) {
        return `Pregunta ${m.current} de ${m.total} · ${m.answered} respondida${m.answered === 1 ? '' : 's'}`;
    }

    function renderProgress() {
        const m = progressModel();
        if (!m.total) return '';

        return `
            <div class="progressWrapper">
                <div class="progressBar" role="progressbar" aria-valuemin="0" aria-valuemax="${m.total}"
                     aria-valuenow="${m.answered}" aria-label="Preguntas respondidas">
                    <div class="progressFill" style="width:${m.percent}%"></div>
                </div>
                <span class="progressText">${progressText(m)}</span>
            </div>`;
    }

    /* Escribir en un campo de texto no puede re-dibujar (el input perderia el
       cursor), asi que la barra se actualiza a mano. Sin esto mostraria el
       valor del render anterior hasta que el alumno avance de pagina. */
    function syncProgress() {
        const bar = document.querySelector('.progressBar');
        if (!bar) return;

        const m = progressModel();
        bar.setAttribute('aria-valuenow', String(m.answered));

        const fill = bar.querySelector('.progressFill');
        if (fill) fill.style.width = `${m.percent}%`;

        const text = document.querySelector('.progressText');
        if (text) text.textContent = progressText(m);
    }

    /* ---------- preguntas ---------- */

    function renderAnswerArea(question) {
        if (question.type === 'multiple') {
            const selected = new Set(toArray(state.answers[question.id]));
            const multi = isMultiSelect(question);

            return `<div class="optionContainer" role="${multi ? 'group' : 'radiogroup'}"
                     aria-required="true" aria-labelledby="qtitle-${question.id}">${
                question.options.map((option) => `
                <div class="optionRow selectable ${multi ? 'multi' : 'single'} ${selected.has(option.id) ? 'selected' : ''}"
                     data-option="${option.id}"
                     role="${multi ? 'checkbox' : 'radio'}"
                     aria-checked="${selected.has(option.id)}"
                     tabindex="0">
                    <div class="${multi ? 'checkSquare' : 'radioCircle'}"></div>
                    <span class="optionText">${esc(option.text) || '<span class="placeholderText">Alternativa sin texto</span>'}</span>
                </div>`).join('')}</div>`;
        }

        if (question.type === 'corto') {
            return `
                <div class="optionContainer">
                    <div class="optionRow">
                        <input type="text" class="optionInput answerInput" data-answer="${question.id}"
                               placeholder="Tu respuesta" required aria-required="true"
                               value="${esc(state.answers[question.id] || '')}">
                    </div>
                </div>`;
        }

        return `
            <div class="optionContainer">
                <div class="optionRow">
                    <textarea class="optionInput answerTextarea" data-answer="${question.id}"
                              placeholder="Tu respuesta" required aria-required="true"
                              >${esc(state.answers[question.id] || '')}</textarea>
                </div>
            </div>`;
    }

    /* El flag por si solo no alcanza: state.invalid guarda ids y nunca se
       limpia al responder, asi que una pregunta ya contestada podia volver a
       pintarse en rojo al navegar de vuelta. Se deriva del estado real. */
    function renderQuestion(question, index) {
        const invalid = state.invalid.has(question.id) && !isAnswered(question);
        return `
            <section class="card questionCard ${invalid ? 'invalid' : ''}" data-id="${question.id}"
                     ${invalid ? 'aria-invalid="true"' : ''}>
                <div class="questionHeader">
                    <span class="questionNumber">${index + 1}</span>
                    <h2 id="qtitle-${question.id}" class="questionTitleStatic">${esc(question.title) || 'Pregunta sin título'}</h2>
                    <span class="requiredBadge">Obligatoria</span>
                </div>
                ${renderAnswerArea(question)}
                ${invalid ? '<p class="errorMessage" role="alert">Esta pregunta es obligatoria.</p>' : ''}
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
        if (!state.questions.length) {
            return renderHeader() + `
                <div class="card">
                    <p class="errorMessage">Este examen todavía no tiene preguntas.</p>
                </div>`;
        }

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
        const backBtn = isLocked() ? '' :
            `<button type="button" class="btn btnGhost" data-nav="back">Volver a editar</button>`;

        return `
            ${renderHeader()}
            <div class="card">
                <h2 class="reviewTitle">Revisa tus respuestas</h2>
                ${rows}
                <div class="navButtons">
                    ${backBtn}
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

        const isFull = item.exact;
        const isPartial = !isFull && item.earned > 0;
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
        if (item.exact) return 'Correcta';
        // floor, no round: un parcial jamas debe mostrarse como 100%.
        if (item.earned > 0) return `Parcial: ${Math.floor(item.earned * 100)}%`;
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
            state.answers[question.id] = toggleAnswer(
                question, row.dataset.option, isMultiSelect(question)
            );
            state.invalid.delete(question.id);
            // Sin esto el re-render se lleva el foco y quien responde con
            // teclado tendria que volver a la primera alternativa cada vez.
            state.focusTarget = { kind: 'answerOption', optionId: row.dataset.option };
            App.render();
        }
    }

    /* Radio reemplaza, checkbox alterna. */
    function toggleAnswer(question, optionId, multi) {
        const current = toArray(state.answers[question.id]);
        if (!multi) return [optionId];

        return current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
    }

    function onInput(event) {
        const questionId = event.target.dataset.answer;
        if (!questionId) return;
        state.answers[questionId] = event.target.value;
        syncProgress();

        /* No se puede re-dibujar aca: el input perderia el cursor mientras se
           escribe. El error obsoleto se borra a mano del DOM. */
        if (!state.invalid.has(questionId) || !event.target.value.trim()) return;

        state.invalid.delete(questionId);
        const card = event.target.closest('.questionCard');
        if (!card) return;

        card.classList.remove('invalid');
        card.removeAttribute('aria-invalid');
        const msg = card.querySelector('.errorMessage');
        if (msg) msg.remove();
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
                if (isLocked()) return;   // el Estudiante no vuelve atras
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
