/* Coordina el render global y los dos modos. */

const App = (() => {

    const app = document.getElementById('app');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const previewBtn = document.getElementById('previewBtn');

    function isStudentView() {
        return state.view !== 'editor';
    }

    function render() {
        app.innerHTML = isStudentView() ? Student.render() : Editor.render();
        document.body.classList.toggle('studentMode', isStudentView());
        applyFocus();
    }

    /* El re-render completo borra el foco, así que lo devolvemos
       cuando el motivo del render fue "acaba de agregar algo". */
    function applyFocus() {
        const target = state.focusTarget;
        if (!target) return;

        state.focusTarget = null;
        if (target.kind === 'option') {
            const input = document.querySelector(`[data-option-input="${target.optionId}"]`);
            if (input) input.focus();
        }
    }

    function addQuestion() {
        const question = newQuestion('multiple');
        state.questions.push(question);
        render();
    }

    function toggleMode() {
        if (isStudentView()) {
            state.view = 'editor';
            state.invalid = new Set();
        } else {
            state.view = 'student';
            state.page = 0;
            state.invalid = new Set();
        }

        previewBtn.innerHTML = isStudentView()
            ? '<span class="menuIcon">✏️</span>'
            : '<span class="menuIcon">👁️</span>';
        previewBtn.title = isStudentView() ? 'Volver a edición' : 'Vista previa / Modo estudiante';

        render();
    }

    function init() {
        addQuestionBtn.addEventListener('click', addQuestion);
        previewBtn.addEventListener('click', toggleMode);

        app.addEventListener('click', (event) => {
            if (isStudentView()) {
                Student.onClick(event);
            } else {
                Editor.onClick(event);
            }
        });

        app.addEventListener('input', (event) => {
            if (isStudentView()) {
                Student.onInput(event);
            } else {
                Editor.onInput(event);
            }
        });

        app.addEventListener('change', (event) => {
            if (!isStudentView()) Editor.onChange(event);
        });

        app.addEventListener('mousedown', Editor.onMouseDown);
        app.addEventListener('dragstart', Editor.onDragStart);
        app.addEventListener('dragover', Editor.onDragOver);
        app.addEventListener('drop', Editor.onDrop);
        app.addEventListener('dragend', Editor.onDragEnd);

        render();
    }

    return { render, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
