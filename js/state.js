/* Estado global de la demo.
   Sin dependencias, sin build step: se abre index.html y funciona.
   Este objeto es la unica fuente de verdad; el DOM se dibuja a partir de aca.

   OJO: este archivo define los simbolos compartidos (toArray, isMultiSelect,
   correctOptionsOf, scoreQuestion...) que usan exam.js, editor.js y app.js.
   Si queda una version vieja en cache mezclada con las nuevas de los otros,
   todo lo que los use revienta con ReferenceError. Ver el loader de index.html. */

const PAGE_SIZE = 1;

const state = {
    mode: 'editor',     // 'editor' | 'prueba' | 'estudiante'  -> quien controla la pantalla
    stage: 'form',      // 'start' | 'form' | 'review' | 'result' -> donde esta dentro del modo
    page: 0,
    title: 'Examen sin Título',
    description: '',
    questions: [],
    answers: {},        // questionId -> array de optionIds (multiple) | texto (corto/parrafo)
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

/* Solo bloquea el cierre mientras se está respondiendo: en la revision ya no
   queda nada por decidir, asi que la pestana se puede cerrar. */
const isInProgress = () => isLocked() && state.stage === 'form';

/* Cuenta solo respuestas reales. Deseleccionar el ultimo checkbox deja
   answers[id] = [], que no es una respuesta y no debe contar. */
const hasAnswers = () => state.questions.some((q) => isAnswered(q));

function totalPages() {
    return Math.max(1, Math.ceil(state.questions.length / PAGE_SIZE));
}

function questionsOfPage(page = state.page) {
    const start = page * PAGE_SIZE;
    return state.questions.slice(start, start + PAGE_SIZE);
}

/* El valor guardado siempre es un array de optionIds, incluso con una sola
   correcta. Asi la UI puede alternar entre radio y checkbox sin cambiar el
   formato de los datos. */
const toArray = (value) => (Array.isArray(value) ? value : []);

const selectedOptions = (question) => {
    const ids = new Set(toArray(state.answers[question.id]));
    return question.options.filter((o) => ids.has(o.id));
};

const correctOptionsOf = (question) => question.options.filter((o) => o.correct);

/* Con 2+ claves la pregunta admite varias respuestas; con una sola, es radio. */
const isMultiSelect = (question) =>
    question.type === 'multiple' && correctOptionsOf(question).length > 1;

function isAnswered(question) {
    if (question.type === 'multiple') return selectedOptions(question).length > 0;
    const answer = state.answers[question.id];
    return answer !== undefined && answer !== null && String(answer).trim().length > 0;
}

function answerOf(question) {
    if (question.type === 'multiple') {
        return selectedOptions(question).map((o) => o.text).join(', ');
    }

    const answer = state.answers[question.id];
    return answer === undefined ? '' : String(answer);
}

/* ---------- correccion ---------- */

/* Una pregunta de texto nunca puntua. Una multiple sin clave marcada tampoco:
   contarla seria castigar al alumno por un error del docente. */
function isEvaluable(question) {
    return question.type === 'multiple' && correctOptionsOf(question).length > 0;
}

const correctCountOf = (question) => correctOptionsOf(question).length;

function scoreQuestion(question) {
    const correct = correctOptionsOf(question);
    if (!correct.length) {
        return { pending: true, noKey: true, earned: 0, correctCount: 0, exact: false };
    }

    const selected = selectedOptions(question);
    const correctIds = new Set(correct.map((o) => o.id));
    const hits = selected.filter((o) => correctIds.has(o.id)).length;
    const wrongPicked = selected.filter((o) => !o.correct).length;

    /* El 100% exige el conjunto exacto: todas las correctas y ninguna de mas.
       Cada incorrecta descontada resta el mismo tanto que aporta un acierto,
       asi que marcar de mas nunca puede dejar el puntaje en 1. */
    const exact = hits === correct.length && wrongPicked === 0;
    const earned = exact ? 1 : Math.max(0, (hits - wrongPicked) / correct.length);

    return {
        pending: false,
        noKey: false,
        earned,
        correctCount: correct.length,
        exact
    };
}

function evaluate() {
    const detail = state.questions.map((question) => ({
        question,
        ...scoreQuestion(question)
    }));

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
