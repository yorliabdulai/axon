import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EscalationEngine } from './escalation.js';

describe('EscalationEngine', () => {
  const engine = new EscalationEngine();

  it('escalates on explicit keyword', () => {
    const result = engine.check({
      message: 'I want to speak to a person',
      language: 'en',
      confidence: 0.9,
      confidenceThreshold: 0.65,
      escalationKeywords: ['speak to a person', 'human agent'],
      previousQuestions: [],
    });
    assert.equal(result.shouldEscalate, true);
    assert.equal(result.reason, 'explicit_keyword');
  });

  it('escalates on low confidence', () => {
    const result = engine.check({
      message: 'What is your refund policy?',
      language: 'en',
      confidence: 0.4,
      confidenceThreshold: 0.65,
      escalationKeywords: [],
      previousQuestions: [],
    });
    assert.equal(result.shouldEscalate, true);
    assert.equal(result.reason, 'low_confidence');
  });

  it('escalates on repeat question', () => {
    const result = engine.check({
      message: 'same question',
      language: 'en',
      confidence: 0.8,
      confidenceThreshold: 0.65,
      escalationKeywords: [],
      previousQuestions: ['same question', 'same question'],
    });
    assert.equal(result.shouldEscalate, true);
    assert.equal(result.reason, 'repeat_question');
  });

  it('escalates on sensitive intent', () => {
    const result = engine.check({
      message: 'I want to file a complaint about billing',
      language: 'en',
      confidence: 0.9,
      confidenceThreshold: 0.65,
      escalationKeywords: [],
      previousQuestions: [],
    });
    assert.equal(result.shouldEscalate, true);
    assert.equal(result.reason, 'sensitive_intent');
  });

  it('does not escalate normal queries', () => {
    const result = engine.check({
      message: 'What are your opening hours?',
      language: 'en',
      confidence: 0.85,
      confidenceThreshold: 0.65,
      escalationKeywords: ['speak to a person'],
      previousQuestions: [],
    });
    assert.equal(result.shouldEscalate, false);
  });
});
