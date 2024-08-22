import React, { useEffect, useState } from 'react';

function PointModal({ isOpen, onClose, onSave, pointData, quizMode }) {
    const [title, setTitle] = useState('');
    const [question, setQuestion] = useState('');
    const [quizType, setQuizType] = useState('single');
    const [answers, setAnswers] = useState([{text: '', isCorrect: true }]);
    const [shuffledAnswers, setShuffledAnswers] = useState([]); // to have the answers shuffled for quiz mode
    const [userSelections, setUserSelections] = useState([]); // what answers the user selected in quiz mode

    useEffect(() => { // if in quiz mode you need the point information and populate the modal
        if(pointData && quizMode) {
            setTitle(pointData.title);
            setQuestion(pointData.quiz.question);
            setQuizType(pointData.quiz.type);
            setAnswers(pointData.quiz.answers);
        }        
    }, [pointData]);

    useEffect(() => { // shuffle the answers only once
        if(answers.length > 0) {
            setShuffledAnswers(shuffleAnswers([...answers]));
        }
    }, [answers]);

    const handleAddAnswer = () => {
        setAnswers([...answers, {text: '', isCorrect: false }]);
    };

    const handleRemoveAnswer = (index) => {
        setAnswers(answers.filter((_, i) => i !== index));
    };

    const handleChangeAnswer = (index, field, value) => {
        const updatedAnswers = answers.map((answer, i) => {
            if(i === index) {
                return {...answer, [field]: value};
            }
            return answer;
        });
        setAnswers(updatedAnswers);
    };

    const handleSave = () => {
        if(title && question && (answers[0].text || quizType === 'short-answer')) {
            onSave({
                title,
                quiz: {
                    question,
                    type: quizType,
                    answers: answers.filter(ans => ans.text.trim() != '')
                }
            });
            onClose();
        } else {
            alert('Please fill all fields - title, question and answers.');
        }
    }

    const handleSelectionChange = (answerId) => {
        if (quizType === 'multiple') {
            setUserSelections(prev => {
                const newState = {...prev, [answerId]: !prev[answerId]};
                return newState;
            });
        } else {
            setUserSelections({[answerId]: true});
        }
    };

    const handleInputChange = (answerId, value) => {
        setUserSelections(prev => ({
            ...prev,
            [answerId]: value
        }));
    };

    const evaluateAnswers = () => {
        if (quizType === 'short-answer') {
            let correctCount = 0;
            answers.forEach(answer => {
                if (userSelections[answer._id] && userSelections[answer._id].trim().toLowerCase() === answer.text.toLowerCase()) {
                    correctCount++;
                }
            });
        
            alert(`You answered ${correctCount} out of ${answers.length} questions correctly.`);
        } else {
            let correctCount = answers.filter(answer => userSelections[answer._id] === answer.isCorrect).length;
            let totalCorrect = answers.filter(answer => answer.isCorrect).length;
    
            alert(`You got ${correctCount} out of ${totalCorrect} correct.`);
            correctCount = 0;
        }
    };

    function shuffleAnswers(answers) {
        let idx = answers.length, randomIndex;
        while (idx !== 0) {
            randomIndex = Math.floor(Math.random() * idx);
            idx--;
            [answers[idx], answers[randomIndex]] = [answers[randomIndex], answers[idx]];
        }
        return answers;
    }

    if(!isOpen) return null;

    return (
        <div className="modal p-4">
            <div className="modal-content my-4 flex flex-col">
                <span className="close" onClick={onClose}>&times;</span>
                <div className='my-4'>
                    <input type="text" placeholder="Point Title" value={title} onChange={e => setTitle(e.target.value)} className='border-2 border-gray-500 px-4' readOnly={quizMode} />
                </div>
                <div className='my-4'>
                    <input type="text" placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} className='border-2 border-gray-500 px-4' readOnly={quizMode} />
                </div>
                <div className='my-4'>
                    <select value={quizType} onChange={e => setQuizType(e.target.value)} disabled={quizMode}>
                        <option value="single">Single Correct Answer</option>
                        <option value="multiple">Multiple Correct Answers</option>
                        <option value="short-answer">Short Answer</option>
                    </select>
                </div>
                { !quizMode ? ( // edit-mode by creation or editing
                    <>
                    <div className='my-4'>
                        <input type="text" placeholder="Point Title" value={title} onChange={e => setTitle(e.target.value)} className='border-2 border-gray-500 px-4' />
                    </div>
                    <div className='my-4'>
                        <input type="text" placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} className='border-2 border-gray-500 px-4' />
                    </div>
                    <div className='my-4'>
                        <select value={quizType} onChange={e => setQuizType(e.target.value)}>
                            <option value="single">Single Correct Answer</option>
                            <option value="multiple">Multiple Correct Answers</option>
                            <option value="short-answer">Short Answer</option>
                        </select>
                    </div>
                    </> &&
                    quizType === 'short-answer' ? (
                        <input
                            type="text"
                            value={answers[0].text}
                            onChange={e => handleChangeAnswer(0, 'text', e.target.value)}
                            placeholder="Correct Answer"
                        />
                    ) : (
                        answers.map((answer, index) => (
                            <div className='my-4' key={index}>
                                <input key={index} type="text" placeholder={`Answer Text`} value={answer.text} onChange={e => {
                                    handleChangeAnswer(index, 'text', e.target.value)
                                }} className='border-2 border-gray-500 px-4' />
                                {quizType === 'multiple' && (
                                    <>
                                    <span>Correct Answer</span>
                                    <input type="checkbox" checked={answer.isCorrect} onChange={e => handleChangeAnswer(index, 'isCorrect', e.target.checked)}></input>
                                    </>
                                )}
                                <button onClick={() => handleRemoveAnswer(index)}>Remove</button>
                            </div>
                        )
                    ))
                ) : ( // quiz mode
                    quizType === 'short-answer' ? (
                        answers.map((answer, index) => (
                            <div className='my-4' key={answer._id || index}>
                                 <input type="text" checked={userSelections[answer._id] || ''} onChange={(e) => handleInputChange(answer._id, e.target.value)} placeholder="Type your answer" />
                            </div>
                        ))
                    ) : (
                        shuffledAnswers.map((answer, index) => (
                            <div className='my-4' key={answer._id || index}>
                                { quizType === 'multiple' ? 
                                    <label>
                                        <input type="checkbox" checked={!!userSelections[answer._id]} onChange={() => handleSelectionChange(answer._id)} /> {answer.text}
                                    </label>
                                :
                                    <label>
                                        <input type="radio" name='singleChoice' checked={userSelections[answer._id] === true} onChange={() => handleSelectionChange(answer._id)} /> {answer.text}
                                    </label>
                                }
                            </div>
                        ))
                    )
                )
                }
                {quizType !== 'short-answer' && !quizMode && <button onClick={handleAddAnswer}>Add Another Answer</button>}
                { quizMode ? (
                    <button className='p-2 bg-sky-300 m-4' onClick={evaluateAnswers}>Check Answers</button>
                ) : (
                    <button className='p-2 bg-sky-300 m-4' onClick={handleSave}>Save Point</button>
                )}
            </div>
        </div>
    );
}

export default PointModal;