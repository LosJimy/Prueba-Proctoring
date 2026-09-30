/* Estado global de la demo.
   Sin dependencias, sin build step: se abre index.html y funciona.
   Este objeto es la unica fuente de verdad; el DOM se dibuja a partir de aca. */

const PAGE_SIZE = 1;

const state = {
    mode: 'editor',     // 'editor' | 'prueba' | 'estudiante'  -> quien controla la pantalla
    stage: 'form',      // 'start' | 'form' | 'review' | 'result' -> donde esta dentro del modo
    page: 0,
    title: 'Examen sin Título',
    description: '',
    questions: [],
    answers: {},        // questionId -> optionId (multiple) | texto (corto/parrafo)
    invalid: new Set(), // questionIds que fallaron la validacion
    focusTarget: null   // { kind, questionId, optionId } para devolver el foco tras render()
};

let idSeq = 0;
const uid = (prefix) => `${prefix}_${++idSeq}`;

const newOption = (text = '', correct = false) => ({ id: uid('opt'), text, correct });

function newQuestion(type = 'multiple') {
    const question = {
        id: uid('q'),
        title: 'Pregunta sin título',
        type: type,
        options: []
    };

    if (type === 'multiple') {
        question.options = [newOption('Opción 1'), newOption('Opción 2')];
    }

    return question;
}

/* Contenido inicial para que la demo tenga algo que responder.
   Q2 tiene dos correctas a proposito, para probar el puntaje proporcional. */
function seedQuestions() {
    const capital = newQuestion('multiple');
    capital.title = '¿Cuál es la capital de Chile?';
    capital.options = [
        newOption('Santiago', true),
        newOption('Valparaíso'),
        newOption('Concepción')
    ];

    const meses = newQuestion('multiple');
    meses.title = '¿Cuáles de estos meses tienen 30 días?';
    meses.options = [
        newOption('Abril', true),
        newOption('Junio', true),
        newOption('Enero'),
        newOption('Diciembre')
    ];

    const corto = newQuestion('corto');
    corto.title = 'Define proctoring en una línea';

    const parrafo = newQuestion('parrafo');
    parrafo.title = 'Describe tu experiencia con sistemas de supervisión en línea';

    state.questions = [capital, meses, corto, parrafo];
}

/* ---------- helpers ---------- */

const getQuestion = (id) => state.questions.find((q) => q.id === id);
const questionIndex = (id) => state.questions.findIndex((q) => q.id === id);

/* El modo Estudiante no tiene vuelta atras: solo se sale enviando. */
const isLocked = () => state.mode === 'estudiante';

/* Tras enviar, el intento ya no está en curso y se puede cerrar la pestaña. */
const isInProgress = () => isLocked() && state.stage !== 'result';

const hasAnswers = () => Object.keys(state.answers).length > 0;

function totalPages() {
    return Math.max(1, Math.ceil(state.questions.length / PAGE_SIZE));
}

function questionsOfPage(page = state.page) {
    const start = page * PAGE_SIZE;
    return state.questions.slice(start, start + PAGE_SIZE);
}

function isAnswered(question) {
    const answer = state.answers[question.id];
    if (answer === undefined || answer === null) return false;
    if (question.type === 'multiple') return question.options.some((o) => o.id === answer);
    return String(answer).trim().length > 0;
}

function answerOf(question) {
    const answer = state.answers[question.id];
    if (answer === undefined) return '';

    if (question.type === 'multiple') {
        const option = question.options.find((o) => o.id === answer);
        return option ? option.text : '';
    }

    return String(answer);
}

/* ---------- correccion ---------- */

/* Una pregunta de texto nunca puntua. Una multiple sin clave marcada tampoco:
   contarla seria castigar al alumno por un error del docente. */
function isEvaluable(question) {
    return question.type === 'multiple' && question.options.some((o) => o.correct);
}

function correctCountOf(question) {
    return question.options.filter((o) => o.correct).length;
}

/* Credito proporcional: acertar 1 de 2 correctas da 0,5. */
function evaluate() {
    const detail = state.questions.map((question) => {
        const base = { question, pending: true, noKey: false, earned: 0, correctCount: 0 };

        if (question.type !== 'multiple') return base;

        const correctOptions = question.options.filter((o) => o.correct);
        if (!correctOptions.length) return { ...base, noKey: true };

        const selected = state.answers[question.id];
        const hits = correctOptions.filter((o) => o.id === selected).length;

        return {
            ...base,
            pending: false,
            correctCount: correctOptions.length,
            earned: hits / correctOptions.length,
            selectedId: selected
        };
    });

    const evaluable = detail.filter((d) => !d.pending);
    const earned = evaluable.reduce((sum, d) => sum + d.earned, 0);
    const percent = evaluable.length ? (earned / evaluable.length) * 100 : 0;

    return { detail, evaluable, earned, percent };
}

/* Escapar texto antes de meterlo en HTML. */
function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

seedQuestions();
