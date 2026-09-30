/* Vista de edicion: unanswered preguntas, agregar / eliminar / duplicar / arrastrar. */

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
                <input type="text" class="titleInput" data-field="title"
                       placeholder="Título del formulario" value="${esc(state.title)}">
                <textarea class="descriptionInput" data-field="description"
                          placeholder="Descripción del formulario">${esc(state.description)}</textarea>
            </header>`;
    }

    function renderOptions(question) {
        const rows = question.options.map((option, i) => `
            <div class="optionRow" data-option="${option.id}">
                <div class="radioCircle"></div>
                <input type="text" class="optionInput" data-option-input="${option.id}"
                       value="${esc(option.text)}" placeholder="Opción ${i + 1}">
                <button type="button" class="iconBtn deleteOptionBtn"
                        data-action="delete-option" title="Eliminar opción">🗑</button>
            </div>`).join('');

        return `
            <div class="optionContainer">
                ${rows}
                ${question.type === 'multiple' ? `
                <div class="optionRow addOptionRow" data-action="add-option">
                    <div class="radioCircle addCircle"></div>
                    <input type="text" class="optionInput addOptionInput"
                           placeholder="Añadir opción" readonly>
                </div>` : ''}
            </div>`;
    }

    function renderQuestion(question, index) {
        const isOnly = state.questions.length === 1;
        return `
            <section class="card questionCard" data-id="${question.id}" draggable="false">
                <div class="questionHeader">
                    <span class="questionNumber">${index + 1}</span>
                    <input type="text" class="questionTitleInput" data-field="title"
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

    function render() {
        const questions = state.questions.length
            ? state.questions.map(renderQuestion).join('')
            : `<div class="card emptyState">
                   <p>Este formulario todavía no tiene preguntas.</p>
               </div>`;

        return renderHeader() + questions;
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

    function addOption(card) {
        const question = getQuestion(card.dataset.id);
        const option = newOption('');
        question.options.push(option);
        state.focusTarget = { kind: 'option', questionId: question.id, optionId: option.id };
        App.render();
    }

    function deleteOption(question, row) {
        if (!question || question.options.length <= 1) return;
        const optionId = row.dataset.option;
        question.options = question.options.filter((o) => o.id !== optionId);
        if (state.answers[question.id] === optionId) delete state.answers[question.id];
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

    function onInput(event) {
        const target = event.target;
        const field = target.dataset.field;

        if (target.id === 'app') return;

        if (field === 'title' || field === 'description') {
            state[field] = target.value;
            return;
        }

        const optionId = target.dataset.optionInput;
        if (!optionId) return;

        const question = getQuestion(target.closest('.questionCard').dataset.id);
        const option = question.options.find((o) => o.id === optionId);
        if (option) option.text = target.value;
    }

    function onChange(event) {
        const target = event.target;
        if (!target.classList.contains('questionTypeSelect')) return;

        const question = getQuestion(target.closest('.questionCard').dataset.id);
        if (!question || question.type === target.value) return;

        question.type = target.value;
        question.options = target.value === 'multiple'
            ? [newOption('Opción 1'), newOption('Opción 2')]
            : [];
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
        let to = questionIndex(card.dataset.id);
        const [question] = state.questions.splice(from, 1);
        if (from < to) to -= 1;
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
