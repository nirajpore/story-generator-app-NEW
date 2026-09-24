'use client';

import { useState } from 'react';

export default function ComprehensionPanel({ 
  questions = [], 
  onComplete,
  onSkip
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="comprehension-panel">
        <h3>📚 Story Check</h3>
        <p>No comprehension questions available for this story.</p>
        {onSkip && (
          <button className="comprehension-skip-btn" onClick={onSkip}>
            Continue to Results
          </button>
        )}
      </div>
    );
  }

  const handleAnswer = (selectedOption) => {
    const question = questions[currentQuestion];
    const isCorrect = selectedOption === question.correctAnswer;
    
    const newAnswers = [
      ...answers,
      {
        questionIndex: currentQuestion,
        selectedOption,
        isCorrect,
        questionType: question.type
      }
    ];
    
    setAnswers(newAnswers);
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
    } else {
      // All questions completed
      const comprehensionScore = Math.round((score / questions.length) * 100);
      onComplete({
        score,
        total: questions.length,
        percentage: comprehensionScore,
        answers,
        breakdown: calculateBreakdown(answers, questions)
      });
    }
  };

  const calculateBreakdown = (answers, questions) => {
    const types = ['literal', 'inferential', 'vocabulary'];
    const breakdown = {};
    
    types.forEach(type => {
      const typeQuestions = questions.filter(q => q.type === type);
      const typeAnswers = answers.filter(a => 
        questions[a.questionIndex]?.type === type
      );
      const correct = typeAnswers.filter(a => a.isCorrect).length;
      breakdown[type] = typeQuestions.length > 0 
        ? Math.round((correct / typeQuestions.length) * 100)
        : 0;
    });
    
    return breakdown;
  };

  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  return (
    <div className="comprehension-panel">
      <div className="comprehension-header">
        <h3>📚 Story Check</h3>
        <div className="comprehension-progress">
          Question {currentQuestion + 1} of {questions.length}
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="score-display">
          Score: {score}/{questions.length}
        </div>
      </div>

      {showExplanation ? (
        <div className="explanation-section">
          <div className={`feedback ${answers[currentQuestion]?.isCorrect ? 'correct' : 'incorrect'}`}>
            {answers[currentQuestion]?.isCorrect ? (
              <><span className="emoji">🎉</span> Correct!</>
            ) : (
              <><span className="emoji">💪</span> Good try!</>
            )}
          </div>
          <div className="explanation">
            <p className="explanation-title">Why?</p>
            <p className="explanation-text">{currentQ.explanation}</p>
          </div>
          <button className="comprehension-next-btn" onClick={handleNext}>
            {isLastQuestion ? 'See Final Score' : 'Next Question'}
          </button>
        </div>
      ) : (
        <div className="question-section">
          <div className="question-meta">
            <span className={`question-type ${currentQ.type}`}>
              {currentQ.type === 'literal' ? '📖 Fact Check' : 
               currentQ.type === 'inferential' ? '🤔 Think About It' : 
               '📝 Word Meaning'}
            </span>
            {currentQ.type === 'inferential' && (
              <span className="question-hint">(No right answer in the story - think about it!)</span>
            )}
          </div>
          
          <p className="question-text">{currentQ.question}</p>
          
          <div className="options-grid">
            {currentQ.options.map((option, idx) => (
              <button
                key={idx}
                className={`option-btn ${answers.length > currentQuestion && answers[currentQuestion]?.selectedOption === idx ? 'selected' : ''}`}
                onClick={() => !showExplanation && handleAnswer(idx)}
                disabled={showExplanation}
              >
                <span className="option-label">{String.fromCharCode(65 + idx)}.</span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>

          {onSkip && (
            <button className="comprehension-skip-btn" onClick={onSkip}>
              Skip Questions
            </button>
          )}
        </div>
      )}
    </div>
  );
}