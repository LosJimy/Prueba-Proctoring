/* Estado global de la demo.
   Sin dependencias, sin build step: se abre index.html y funciona.
   Este objeto es la unica fuente de verdad; el DOM se dibuja a partir de aca. */

const PAGE_SIZE = 1;

const state = {
    view: 'editor',            // 'editor' | 'student' | 'review' | 'done'
    page: 0,
    title: 'Examen sin Título',
    description: '',
    questions: [],
    answers: {},               // questionId -> optionId (multiple) | texto (corto/parrafo)
    invalid: new Set(),        // questionIds que fallaron la validacion
    focusTarget: null          // { kind, questionId, optionId } para devolver el foco tras render()
};

let idSeq = 0;
const uid = (prefix) => `${prefix}_${++idSeq}`;

const newOption = (text = '') => ({ id: uid('opt'), text });

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

/* Contenido inicial para que la demo tenga algo que responder. */
function seedQuestions() {
    const multiple = newQuestion('multiple');
    multiple.title = '¿Cuál es la capital de Chile?';
    multiple.options = [newOption('Santiago'), newOption('Valparaíso'), newOption('Concepción')];

    const corto = newQuestion('corto');
    corto.title = 'Define proctoring en una línea';

    const parrafo = newQuestion('parrafo');
    parrafo.title = 'Describe tu experiencia con sistemas de supervisión en línea';

    state.questions = [multiple, corto, parrafo];
}

/* ---------- helpers ---------- */

const getQuestion = (id) => state.questions.find((q) => q.id === id);
const questionIndex = (id) => state.questions.findIndex((q) => q.id === id);

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
