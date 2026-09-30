/* Vista de edicion: crear preguntas, marcar correctas, reordenar, eliminar. */

const Editor = (() => {

    const TYPE_LABELS = {
        multiple: 'Opción Múltiple',
        corto: 'Respuesta Corta',
        parrafo: 'Párrafo'
    };

    function renderHeader() {
        return `
            <header class="card formHeader">
                <div class="headerColorBar"></div>
                <input type="text" class="titleInput" data-field="exam-title"
                       placeholder="Título del formulario" value="${esc(state.title)}">
                <textarea class="descriptionInput" data-field="exam-description"
                          placeholder="Descripción del formulario">${esc(state.description)}</textarea>
            </header>`;
    }

    /* Como se muestra la clave de una pregunta, en el pie de la tarjeta. */
    function renderKeyInfo(question) {
        if (question.type !== 'multiple') {
            /* Las alternativas quedan ocultas pero no borradas. Avisarlo evita
               la misma confusion en espejo: "donde fueron mis opciones?". */
            const kept = question.options.length;
            const keptNote = kept
                ? ` · ${kept} alternativa${kept > 1 ? 's' : ''} guardada${kept > 1 ? 's' : ''}`
                : '';
            return `<span class="keyInfo">Sin puntaje · texto${keptNote}</span>`;
        }

        const count = correctCountOf(question);
        if (!count) {
            return `<span class="keyInfo warning">⚠ Sin correctas marcadas: no contará en el puntaje</span>`;
        }

        return `<span class="keyInfo">${count} correcta${count > 1 ? 's' : ''} marcada${count > 1 ? 's' : ''}</span>`;
    }

    function renderOptions(question) {
        /* En una pregunta de texto las alternativas no aplican, asi que no se
           dibujan. Siguen guardadas en el modelo y vuelven si el docente pasa
           el tipo a multiple; renderKeyInfo lo dice en el pie de la tarjeta. */
        if (question.type !== 'multiple') return '';

        /* Con una sola alternativa el boton de borrar no puede hacer nada, asi
           que se muestra deshabilitado en vez de ignorar el clic en silencio:
           un boton que no responde sin explicación parece roto. */
        const canDelete = question.options.length > 1;
        const deleteTitle = canDelete
            ? 'Eliminar alternativa'
            : 'No se puede eliminar la última alternativa';

        const rows = question.options.map((option, i) => `
            <div class="optionRow ${option.correct ? 'isCorrect' : ''}" data-option="${option.id}">
                <div class="radioCircle"></div>
                <input type="text" class="optionInput" data-option-input="${option.id}"
                       value="${esc(option.text)}" placeholder="Opción ${i + 1}">
                <button type="button" class="iconBtn correctBtn ${option.correct ? 'on' : ''}"
                        data-action="toggle-correct" title="Marcar como alternativa correcta">✓</button>
                <button type="button" class="iconBtn deleteOptionBtn"
                        data-action="delete-option" title="${deleteTitle}"
                        ${canDelete ? '' : 'disabled'}>🗑</button>
            </div>`).join('');

        return `
            <div class="optionContainer">
                ${rows}
                <div class="optionRow addOptionRow" data-action="add-option">
                    <div class="radioCircle addCircle"></div>
                    <input type="text" class="optionInput addOptionInput"
                           placeholder="Añadir opción" readonly>
                </div>
            </div>`;
    }

    function renderQuestion(question, index) {
        const isOnly = state.questions.length === 1;
        return `
            <section class="card questionCard" data-id="${question.id}" draggable="false">
                <div class="questionHeader">
                    <span class="questionNumber">${index + 1}</span>
                    <input type="text" class="questionTitleInput" data-field="question-title"
                           placeholder="Pregunta" value="${esc(question.title)}">
                    <select class="questionTypeSelect" data-field="type">
                        ${Object.entries(TYPE_LABELS).map(([value, label]) => `
                            <option value="${value}" ${value === question.type ? 'selected' : ''}>${label}</option>
                        `).join('')}
                    </select>
                </div>

                ${renderOptions(question)}

                <div class="questionFooter">
                    <span class="requiredBadge">Obligatoria</span>
                    ${renderKeyInfo(question)}
                    <div class="questionActions">
                        <button type="button" class="iconBtn" data-action="up"
                            title="Subir" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button type="button" class="iconBtn" data-action="down"
                            title="Bajar" ${index === state.questions.length - 1 ? 'disabled' : ''}>↓</button>
                        <button type="button" class="iconBtn" data-action="duplicate"
                            title="Duplicar">⧉</button>
                        <button type="button" class="iconBtn" data-action="delete"
                            title="${isOnly ? 'No se puede eliminar la última pregunta' : 'Eliminar pregunta'}"
                            ${isOnly ? 'disabled' : ''}>🗑</button>
                    </div>
                </div>

                <div class="dragHandle" title="Arrastrar para reordenar">⠿</div>
            </section>`;
    }

    /* Invariante: siempre hay al menos 1 pregunta.
       Lo garantiza deleteQuestion() y el boton 🗑 deshabilitado. */
    function render() {
        return renderHeader() + state.questions.map(renderQuestion).join('');
    }

    /* ---------- eventos ---------- */

    function onClick(event) {
        const actionEl = event.target.closest('[data-action]');
        const card = event.target.closest('.questionCard');

        if (actionEl && actionEl.classList.contains('addOptionRow')) {
            addOption(card);
            return;
        }

        if (!actionEl) return;

        const question = card ? getQuestion(card.dataset.id) : null;
        const index = question ? questionIndex(question.id) : -1;

        switch (actionEl.dataset.action) {
            case 'toggle-correct':
                toggleCorrect(question, actionEl.closest('.optionRow'));
                break;
            case 'delete-option':
                deleteOption(question, actionEl.closest('.optionRow'));
                break;
            case 'delete':
                deleteQuestion(index);
                break;
            case 'duplicate':
                duplicateQuestion(index);
                break;
            case 'up':
                moveQuestion(index, -1);
                break;
            case 'down':
                moveQuestion(index, 1);
                break;
        }
    }

    function toggleCorrect(question, row) {
        const option = question.options.find((o) => o.id === row.dataset.option);
        if (!option) return;
        option.correct = !option.correct;
        App.render();
    }

    function addOption(card) {
        const question = getQuestion(card.dataset.id);
        const option = newOption('');
        question.options.push(option);
        state.focusTarget = { kind: 'option', questionId: question.id, optionId: option.id };
        App.render();
    }

    function deleteOption(question, row) {
        if (!question || question.options.length <= 1) return;   // el boton ya llega deshabilitado
        const optionId = row.dataset.option;
        question.options = question.options.filter((o) => o.id !== optionId);

        const remaining = toArray(state.answers[question.id]).filter((id) => id !== optionId);
        if (remaining.length) state.answers[question.id] = remaining;
        else delete state.answers[question.id];

        App.render();
    }

    function deleteQuestion(index) {
        if (index < 0 || state.questions.length <= 1) return;
        const [removed] = state.questions.splice(index, 1);
        delete state.answers[removed.id];
        App.render();
    }

    function duplicateQuestion(index) {
        if (index < 0) return;
        const source = state.questions[index];
        const copy = JSON.parse(JSON.stringify(source));
        copy.id = uid('q');
        copy.title = `${source.title} (copia)`;
        copy.options = copy.options.map((o) => ({ ...o, id: uid('opt') }));

        state.questions.splice(index + 1, 0, copy);
        App.render();
    }

    function moveQuestion(index, delta) {
        const target = index + delta;
        if (index < 0 || target < 0 || target >= state.questions.length) return;
        const [question] = state.questions.splice(index, 1);
        state.questions.splice(target, 0, question);
        App.render();
    }

    /* Cada input tiene su propio data-field: el titulo del examen y el de cada
       pregunta comparten el mismo concepto pero no el mismo destino, y antes de
       separarlos escribir en uno pisaba silenciosamente al otro. */
    function onInput(event) {
        const target = event.target;
        const field = target.dataset.field;

        if (field === 'exam-title') {
            state.title = target.value;
            return;
        }

        if (field === 'exam-description') {
            state.description = target.value;
            return;
        }

        if (field === 'question-title') {
            const card = target.closest('.questionCard');
            const question = card ? getQuestion(card.dataset.id) : null;
            if (question) question.title = target.value;
            return;
        }

        const optionId = target.dataset.optionInput;
        if (!optionId) return;

        const card = target.closest('.questionCard');
        const question = card ? getQuestion(card.dataset.id) : null;
        if (!question) return;

        const option = question.options.find((o) => o.id === optionId);
        if (option) option.text = target.value;
    }

    function onChange(event) {
        const target = event.target;
        if (!target.classList.contains('questionTypeSelect')) return;

        const question = getQuestion(target.closest('.questionCard').dataset.id);
        if (!question || question.type === target.value) return;

        question.type = target.value;

        /* Las alternativas NO se borran al cambiar el tipo, solo se ocultan
           mientras el tipo no sea multiple. Antes se destruian, y por eso
           habia que pedir confirmacion: el dialogo salia siempre en las
           preguntas con contenido real (las dos del seed) y al cancelarlo el
           select volvia atras sin explicacion, lo que se veia como un tipo
           que no se puede cambiar. Ahora no hay nada que perder, asi que no
           hay dialogo, y al volver a multiple las alternativas y las claves
           siguen intactas. */
        if (target.value === 'multiple' && !question.options.length) {
            question.options = [newOption('Opción 1'), newOption('Opción 2')];
        }

        // La respuesta cambia de forma (array <-> texto), asi que se descarta.
        delete state.answers[question.id];
        state.focusTarget = null;
        App.render();
    }

    /* ---------- drag & drop nativo ---------- */

    let dragId = null;

    function onMouseDown(event) {
        const card = event.target.closest('.questionCard');
        if (!card) return;
        card.draggable = !!event.target.closest('.dragHandle');
    }

    function onDragStart(event) {
        const card = event.target.closest('.questionCard');
        if (!card) return;
        dragId = card.dataset.id;
        card.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', dragId);
    }

    function onDragOver(event) {
        // Sin arrastre en curso no hay nada que insertar. Hace falta el guard
        // porque este listener esta activo tambien en las vistas de examen,
        // donde seleccionar y arrastrar texto no debe marcar ninguna tarjeta.
        if (!dragId) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const card = event.target.closest('.questionCard');
        document.querySelectorAll('.questionCard.dragOver').forEach((el) => {
            if (el !== card) el.classList.remove('dragOver');
        });
        if (card && card.dataset.id !== dragId) card.classList.add('dragOver');
    }

    function onDrop(event) {
        event.preventDefault();
        const card = event.target.closest('.questionCard');
        if (!card || !dragId || card.dataset.id === dragId) return onDragEnd();

        const from = questionIndex(dragId);
        // Un dragId viejo (arrastre perdido, re-render en medio) daria -1 y
        // splice(-1, 1) se llevaria la ultima pregunta por error.
        if (from < 0) return onDragEnd();

        let to = questionIndex(card.dataset.id);
        if (to < 0) return onDragEnd();

        const [question] = state.questions.splice(from, 1);
        if (from < to) to -= 1;   // las de atrás ya corrieron un lugar
        state.questions.splice(to, 0, question);

        onDragEnd();
        App.render();
    }

    function onDragEnd() {
        dragId = null;
        document.querySelectorAll('.dragging, .dragOver').forEach((el) => {
            el.classList.remove('dragging', 'dragOver');
        });
    }

    return { render, onClick, onInput, onChange, onMouseDown, onDragStart, onDragOver, onDrop, onDragEnd };
})();
