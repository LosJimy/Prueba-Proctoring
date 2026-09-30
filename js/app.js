/* Coordina el render, la barra de modos y el bloqueo del modo Estudiante. */

const App = (() => {

    const app = document.getElementById('app');
    const view = document.getElementById('view');
    const modeBar = document.getElementById('modeBar');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const pruebaBtn = modeBar.querySelector('[data-mode="prueba"]');
    const estudianteBtn = modeBar.querySelector('[data-mode="estudiante"]');

    function isEditor() {
        return state.mode === 'editor';
    }

    function render() {
        view.innerHTML = isEditor() ? Editor.render() : Exam.render();

        document.body.classList.toggle('examMode', !isEditor());
        document.body.classList.toggle('lockedMode', isLocked());

        syncModeBar();
        applyFocus();
    }

    function syncModeBar() {
        // En Prueba el mismo boton sirve para volver a edicion.
        if (state.mode === 'prueba') {
            pruebaBtn.textContent = '✏️ Volver';
            pruebaBtn.dataset.mode = 'editor';
        } else {
            pruebaBtn.textContent = '🧪 Prueba';
            pruebaBtn.dataset.mode = 'prueba';
        }

        // En Estudiante el boton de Prueba no lleva a ningun lado: se muestra
        // deshabilitado en vez de ignorar el clic en silencio.
        pruebaBtn.disabled = isLocked();

        pruebaBtn.classList.toggle('active', state.mode === 'prueba');
        estudianteBtn.classList.toggle('active', isLocked());
    }

    /* El re-render completo borra el foco, asi que lo devolvemos
       cuando el motivo del render fue "acaba de agregar algo". */
    function applyFocus() {
        const target = state.focusTarget;
        if (!target) return;

        state.focusTarget = null;

        // preventScroll: focus() a secas hace que el navegador salte a dejar
        // el elemento visible, y el foco tambien se restaura cuando el click
        // vino del mouse, donde no queremos ningun salto.
        // Opcion nueva en el editor: el foco va al input de texto.
        if (target.kind === 'option') {
            const input = document.querySelector(`[data-option-input="${target.optionId}"]`);
            if (input) input.focus({ preventScroll: true });
            return;
        }

        // Alternativa elegida en el examen: la fila es el elemento enfocable.
        if (target.kind === 'answerOption') {
            const row = document.querySelector(`.optionRow[data-option="${target.optionId}"]`);
            if (row) row.focus({ preventScroll: true });
        }
    }

    function setMode(target) {
        // Cinturon de seguridad: desde Estudiante no se sale por la barra.
        if (isLocked() && target !== 'estudiante') return;

        if (target === 'estudiante') {
            if (hasAnswers() && !confirm('Se borrarán las respuestas actuales. ¿Comenzar de nuevo?')) return;
            state.answers = {};
            state.invalid = new Set();
            state.page = 0;
            state.stage = 'start';
        } else {
            // Volver a edicion o entrar a prueba: se conservan las respuestas.
            state.invalid = new Set();
            state.stage = 'form';
            state.page = 0;
        }

        state.mode = target;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function addQuestion() {
        state.questions.push(newQuestion('multiple'));
        render();
    }

    /* El navegador muestra su propio aviso, no se puede personalizar el texto.
       Sirve para evitar cierres accidentales, no para alguien decidido a salir. */
    function onBeforeUnload(event) {
        if (!isInProgress()) return;
        event.preventDefault();
        event.returnValue = '';
    }

    /* Si el navegador mezclara una version vieja de state.js con los archivos
       nuevos, faltan los simbolos compartidos y todo lo que los usa revienta
       con ReferenceError en un click, lo que se ve como un boton sin efecto.
       Referenciarlos es la forma barata de detectarlo antes de que toque. */
    function sharedSymbolsOk() {
        try {
            [state, toArray, selectedOptions, correctOptionsOf, isMultiSelect,
                isAnswered, answerOf, evaluate, scoreQuestion, esc, getQuestion];
            return true;
        } catch (e) {
            return false;
        }
    }

    function showFatal(titulo, detalle) {
        view.innerHTML = `
            <div class="card">
                <h2 class="reviewTitle">${titulo}</h2>
                <p>${detalle}</p>
                <p><strong>Recargá con Ctrl+Shift+R</strong> para ignorar la caché
                   y volvé a intentar.</p>
            </div>`;
        modeBar.style.display = 'none';
        addQuestionBtn.style.display = 'none';
    }

    function init() {
        if (!sharedSymbolsOk()) {
            return showFatal(
                'La página quedó con archivos de versiones distintas',
                'Se cargó una copia vieja de algún archivo .js junto a las nuevas. ' +
                'Por eso los botones no responden.'
            );
        }

        addQuestionBtn.addEventListener('click', addQuestion);

        modeBar.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-mode]');
            if (btn) setMode(btn.dataset.mode);
        });

        app.addEventListener('click', (event) => {
            if (isEditor()) Editor.onClick(event);
            else Exam.onClick(event);
        });

        app.addEventListener('input', (event) => {
            if (isEditor()) Editor.onInput(event);
            else Exam.onInput(event);
        });

        app.addEventListener('change', (event) => {
            if (isEditor()) Editor.onChange(event);
        });

        // Las opciones son <div>, no botones: sin esto no se puede responder
        // con teclado, y en un examen online eso deja fuera a algunos alumnos.
        app.addEventListener('keydown', (event) => {
            if (isEditor()) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (!event.target.closest('.optionRow.selectable')) return;

            event.preventDefault();
            Exam.onClick(event);
        });

        app.addEventListener('mousedown', Editor.onMouseDown);
        app.addEventListener('dragstart', Editor.onDragStart);
        app.addEventListener('dragover', Editor.onDragOver);
        app.addEventListener('drop', Editor.onDrop);
        app.addEventListener('dragend', Editor.onDragEnd);

        window.addEventListener('beforeunload', onBeforeUnload);

        render();
    }

    return { render, setMode, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
