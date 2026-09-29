document.addEventListener('DOMContentLoaded', () => {
    const formContainer = document.querySelector('.formContainer');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const addOptionBtn = document.querySelector('.addOptionRow');
    const optionContainer = document.querySelector('.optionContainer');
    const previewBtn = document.getElementById('previewBtn');

    previewBtn.addEventListener('click', () => {
        document.body.classList.toggle('studentMode');

        if (document.body.classList.contains('studentMode')) {
            previewBtn.innerHTML = '<span class="plusIcon">✏️</span>';
            previewBtn.title = "Volver a Edición";

            document.querySelectorAll('input[placeholder="Texto de respuesta corta"], textarea[placeholder="Texto de respuesta larga"]').forEach(input => {
                input.disabled = false;
            });
        } else {
            previewBtn.innerHTML = '<span class ="plusIcon">👁️</span>';
            previewBtn.title = "Vista Previa / Modo Estudiante";
        }

        document.querySelectorAll('input[placeholder="Texto de respuesta corta"], textarea[placeholder="Texto de respuesta larga"]').forEach(input => {
            input.disabled = true;
        });
    });

    formContainer.addEventListener('click', (evento) => {
        if (document.body.classList.contains('studentMode')) {
            const optionRow = evento.target.closest('.optionRow');

            if (optionRow) {
                const currentQuestion = optionRow.closest('.questionCard');

                if (!optionRow.querySelector('.radioCircle')) return;

                const allCircles = currentQuestion.querySelectorAll('.radioCircle');
                allCircles.forEach(circle => circle.classList.remove('selected'));

                const clickedCircle = optionRow.querySelector('.radioCircle');
                if (clickedCircle) clickedCircle.classList.add('selected');
            }
        }
    });

    formContainer.addEventListener('click', (evento) => {
        const addOptionRow = evento.target.closest('.addOptionRow');

        if (addOptionRow) {
            const optionContainer = addOptionRow.closest('.optionContainer');
            const optionCount = optionContainer.querySelectorAll('.optionRow').length;
            const newOptionRow = document.createElement('div');

            newOptionRow.classList.add('optionRow');
            newOptionRow.innerHTML = `
                <div class="radioCircle"></div> 
                <input type="text" class="optionInput" value="Opción ${optionCount}">
                <span class="deleteOptionBtn">&#10005;</span>
            `;

            optionContainer.insertBefore(newOptionRow, addOptionRow);
            newOptionRow.querySelector('.optionInput').focus();
        }

        if (evento.target.classList.contains('deleteOptionBtn')) {
            const filaParaBorrar = evento.target.closest('.optionRow');
            if (filaParaBorrar && !filaParaBorrar.classList.contains('addOptionRow')) {
                filaParaBorrar.remove();
            }
        }
    });

    formContainer.addEventListener('change', (evento) => {
        if (evento.target.classList.contains('questionTypeSelect')) {
            const questionCard = evento.target.closest('.questionCard');
            const optionContainer = questionCard.querySelector('.optionContainer');
            const questionType = evento.target.value;

            if (questionType === 'multiple') {
                optionContainer.innerHTML = ` <div class="optionRow">
                        <div class="radioCircle"></div>
                        <input type="text" class="optionInput" value="Opción 1">
                        <span class="deleteOptionBtn">&#10005;</span>
                    </div>
                    <div class="optionRow addOptionRow">
                        <div class="radioCircle addCircle"></div>
                        <input type="text" class="optionInput addOptionInput" placeholder="Añadir opción" readonly>
                    </div>`;
            } else if (questionType === 'corto') {
                optionContainer.innerHTML = `<div class="optionRow">
                        <input type="text" class="optionInput" placeholder="Texto de respuesta corta" disabled>
                    </div>`;
            } else if (questionType === 'parrafo') {
                optionContainer.innerHTML = `<div class="optionRow">
                        <textarea class="optionInput descriptionInput" placeholder="Texto de respuesta larga" disabled style="height: 60px; width: 100%; border: none; border-bottom: 1px dotted var(--text-muted); resize: none; background: transparent;"></textarea>
                    </div>`;
            }
        }
    });

    addQuestionBtn.addEventListener('click', () => {
        const newQuestion = document.createElement('section');
        newQuestion.classList.add('card', 'questioncard');

        newQuestion.innerHTML = `<div class="questionHeader">
                <input type="text" class="questionTitleInput" placeholder="Pregunta" value="Pregunta sin titulo">
                <select class="questionTypeSelect">
                    <option value="multiple">Opción Multiple</option>
                    <option value="corto">Respuesta Corta</option>
                    <option value="parrafo">Párrafo</option>
                </select>
            </div>
            <div class="optionContainer">
                <div class="optionRow">
                    <div class="radioCircle"></div>
                    <input type="text" class="optionInput" value="Opción 1">
                    <span class="deleteOptionBtn">&#10005;</span>
                </div>
                <div class="optionRow addOptionRow">
                    <div class="radioCircle addCircle"></div>
                    <input type="text" class="optionInput addOptionInput" placeholder="Añadir opción" readonly>
                </div>
            </div>`;

        formContainer.appendChild(newQuestion);
        newQuestion.querySelector('.questionTitleInput').focus();
    });
}) 