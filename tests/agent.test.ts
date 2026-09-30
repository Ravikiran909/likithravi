/**
 * Automated Verification & Unit Test Suite for WhatsApp AI Learning Agent
 * Run with: npx tsx tests/agent.test.ts
 */

import { db } from '../server/database/db.ts';
import { detectIntent } from '../server/gemini.ts';
import { quizAgent } from '../server/agents/quiz_agent.ts';
import { plannerAgent } from '../server/agents/planner_agent.ts';
import { progressAgent } from '../server/agents/progress_agent.ts';
import { reminderAgent } from '../server/agents/reminder_agent.ts';
import { ragService } from '../server/rag/rag_service.ts';
import { orchestrateMessage } from '../server/agents/orchestrator.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('🧪 Starting WhatsApp AI Learning Agent Test Suite...\n');

  // Test 1: User Profile Retrieval / Auto-registration
  console.log('Test Suite 1: Database & Student Profile Management');
  const { profile } = db.getOrCreateProfile('+919876543210', 'Rahul Sharma');
  assert(profile.name === 'Rahul Sharma', 'Profile retrieved correctly by phone number');
  assert(profile.subjects.includes('Python'), 'Profile has Python in subjects');
  assert(profile.streak >= 7, 'Streak counter is loaded');

  // Test 2: Fast Slash Command & Intent Detection
  console.log('\nTest Suite 2: Intent Classification & Routing');
  const intent1 = await detectIntent('/quiz Python', 'Name: Rahul');
  assert(intent1.intent === 'GENERATE_QUIZ', 'Intent for /quiz is GENERATE_QUIZ');

  const intent2 = await detectIntent('/progress', 'Name: Rahul');
  assert(intent2.intent === 'TRACK_PROGRESS', 'Intent for /progress is TRACK_PROGRESS');

  const intent3 = await detectIntent('Remind me to study DSA at 7 PM every day', 'Name: Rahul');
  assert(intent3.intent === 'SET_REMINDER', 'Intent for reminder is SET_REMINDER');

  // Test 3: Quiz Generation & Evaluation
  console.log('\nTest Suite 3: Adaptive Quiz Engine');
  const quizMsg = await quizAgent.startQuiz(profile, 'Python', 'Recursion', 'intermediate');
  assert(quizMsg.includes('Question 1/'), 'Quiz starts and outputs formatted Question 1');
  const activeQuiz = db.getActiveQuizSession(profile.userId);
  assert(Boolean(activeQuiz), 'Active quiz session saved in database');

  if (activeQuiz) {
    const q1Answer = activeQuiz.questions[0].correctAnswer;
    const answerResult = await quizAgent.handleQuizAnswer(activeQuiz, q1Answer, profile);
    assert(answerResult.includes('Correct!'), 'Quiz evaluates correct answer properly');
  }

  // Test 4: Study Plan Generation
  console.log('\nTest Suite 4: Study Planner Agent');
  const planResponse = await plannerAgent.handlePlanRequest(
    'I have a mathematics exam in 15 days and can study 2 hours every day.',
    profile
  );
  assert(planResponse.includes('Study Plan Created') || planResponse.includes('Roadmap'), 'Study plan response generated');
  const savedPlan = db.getStudyPlan(profile.userId);
  assert(Boolean(savedPlan && savedPlan.items.length > 0), 'Study plan items persisted in database');

  // Test 5: Progress Report Generation
  console.log('\nTest Suite 5: Progress Agent');
  const progressText = progressAgent.generateProgressReport(profile);
  assert(progressText.includes('YOUR LEARNING PROGRESS'), 'Progress report header formatted');
  assert(progressText.includes('Study Streak'), 'Streak fire included');

  // Test 6: Reminder Scheduling
  console.log('\nTest Suite 6: Reminder Agent');
  const reminderText = reminderAgent.handleReminderRequest('Remind me to study DSA at 8 PM daily', profile);
  assert(reminderText.includes('Reminder Scheduled'), 'Reminder confirmation formatted');
  const reminders = db.getReminders(profile.userId);
  assert(reminders.length > 0, 'Reminder saved in database');

  // Test 7: RAG Document Ingestion & Semantic Retrieval
  console.log('\nTest Suite 7: RAG Knowledge Base');
  const testDoc = await ragService.ingestDocument(
    'Calculus Integration Handbook',
    'Calculus',
    'Textbook Extract',
    'calc_guide.txt',
    'Integration by parts uses the formula integral of u dv = u*v - integral of v du. The LIATE rule helps prioritize u: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, Exponential.'
  );
  assert(testDoc.chunkCount > 0, 'Document chunked into pieces');
  const ragSearch = ragService.search('LIATE rule for integration', 2);
  assert(ragSearch.chunks.length > 0, 'Semantic retrieval found relevant chunks');
  assert(ragSearch.contextString.includes('LIATE'), 'Context string includes verified source text');

  // Test 8: End-to-End Orchestrator Pipeline
  console.log('\nTest Suite 8: Orchestrator Pipeline');
  const orchestrateResult = await orchestrateMessage({
    fromPhone: '+919876543210',
    senderName: 'Rahul Sharma',
    text: 'What should I learn next?',
  });
  assert(orchestrateResult.intent === 'GET_RECOMMENDATION', 'Orchestrator routed recommendation query');
  assert(orchestrateResult.responseText.length > 20, 'Generated comprehensive recommendation response');

  // Test 9: Study Planner Daily Sessions & Exam Reminders Integration
  console.log('\nTest Suite 9: Study Planner & Exam Reminders');
  const sessionItem = {
    id: 'test_session_1',
    dayNumber: 6,
    dateStr: new Date().toISOString().split('T')[0],
    title: 'Dynamic Programming & Memoization',
    topic: 'DP Patterns',
    subject: 'DSA',
    durationMinutes: 90,
    tasks: [
      { task: 'Understand Fibonacci and 0/1 Knapsack', completed: false },
      { task: 'Solve 2 problems on LeetCode', completed: false },
    ],
    isCompleted: false,
    isMissed: false,
    timeSlot: '07:30 PM',
  };
  const updatedPlan = db.addStudyPlanItem(profile.userId, sessionItem);
  assert(
    Boolean(updatedPlan.items.some((i) => i.id === 'test_session_1')),
    'Study Planner successfully schedules and saves daily session item'
  );

  const updatedPlanItem = db.updateStudyPlanItem(profile.userId, 'test_session_1', { isCompleted: true });
  assert(
    updatedPlanItem?.items.find((i) => i.id === 'test_session_1')?.isCompleted === true,
    'Study Planner marks daily session completed'
  );

  // Exam Reminders verification
  const examReminder = {
    id: 'test_exam_rem_1',
    userId: profile.userId,
    whatsappNumber: profile.whatsappNumber,
    reminderText: 'Upcoming Exam: Data Structures Lab Exam',
    targetTime: '08:00 AM',
    frequency: 'daily' as const,
    subject: 'DSA',
    timezone: 'Asia/Kolkata',
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    type: 'exam' as const,
    examTitle: 'Data Structures Lab Exam',
    examDate: '2026-10-28',
    daysBeforeExam: 32,
  };
  db.addReminder(examReminder);
  const studentReminders = db.getReminders(profile.userId);
  assert(
    studentReminders.some((r) => r.type === 'exam' && r.examTitle === 'Data Structures Lab Exam'),
    'Exam reminder created with direct profile integration'
  );

  // Test 10: RAG Docs API & WhatsApp Live Utilities
  console.log('\nTest Suite 10: Docs API & WhatsApp Live Diagnostics');
  const fetchedDoc = ragService.getDocument(testDoc.id);
  assert(Boolean(fetchedDoc.document && fetchedDoc.chunks.length > 0), 'Document and its chunks retrieved cleanly');

  const previewChunks = ragService.previewChunks('This is paragraph 1.\n\nThis is paragraph 2 with Calculus theorems.');
  assert(previewChunks.length >= 1, 'Chunk preview generates valid segments');

  const { whatsapp } = await import('../server/whatsapp/whatsapp_service.ts');
  const normalizedPhone = whatsapp.cleanPhone('9876543210');
  assert(normalizedPhone === '919876543210', 'WhatsApp service normalizes 10-digit phone to international format');

  const waStatus = whatsapp.getStatus();
  assert(Boolean(waStatus.verifyToken), 'WhatsApp verify token loaded');

  const deletedOk = ragService.deleteDocument(testDoc.id);
  assert(deletedOk === true, 'Document and its chunks cleanly deleted from RAG store');

  // Test 11: Webhook Response Codes, Deduplication & Error Logging
  console.log('\nTest Suite 11: Webhook Response Codes & Payload Processing');
  const { handleWebhookVerification, handleIncomingWebhook } = await import('../server/whatsapp/webhook_handler.ts');
  const { waLogger } = await import('../server/whatsapp/whatsapp_logger.ts');

  // 11.1 Verification handshake with valid token -> Expect HTTP 200
  let resStatus = 0;
  let resBody: any = null;
  const mockReqValid: any = {
    query: {
      'hub.mode': 'subscribe',
      'hub.verify_token': whatsapp.getVerifyToken(),
      'hub.challenge': 'my_secure_challenge_string_99',
    },
    ip: '127.0.0.1',
    get: () => 'Meta-Hook',
  };
  const mockResValid: any = {
    status: (code: number) => {
      resStatus = code;
      return {
        send: (b: any) => { resBody = b; },
        json: (j: any) => { resBody = j; },
      };
    },
  };
  handleWebhookVerification(mockReqValid, mockResValid);
  assert(resStatus === 200 && resBody === 'my_secure_challenge_string_99', 'Webhook verification returns HTTP 200 with challenge');

  // 11.2 Verification handshake with invalid token -> Expect HTTP 403
  let resStatusInvalid = 0;
  let resBodyInvalid: any = null;
  const mockReqInvalid: any = {
    query: {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'WRONG_TOKEN',
      'hub.challenge': 'my_secure_challenge_string_99',
    },
    ip: '127.0.0.1',
    get: () => 'Meta-Hook',
  };
  const mockResInvalid: any = {
    status: (code: number) => {
      resStatusInvalid = code;
      return {
        json: (j: any) => { resBodyInvalid = j; },
        send: (b: any) => { resBodyInvalid = b; },
      };
    },
  };
  handleWebhookVerification(mockReqInvalid, mockResInvalid);
  assert(resStatusInvalid === 403, 'Webhook verification rejects invalid token with HTTP 403 Forbidden');

  // 11.3 Logger auto-remediation advice
  const loggedError = waLogger.error('delivery_failure', 'Sandbox delivery issue', {
    phone: '919876543210',
    metaErrorCode: 131030,
  });
  assert(
    Boolean(loggedError.remediation && loggedError.remediation.includes('Sandbox mode')),
    'Logger provides actionable remediation advice for Meta error code 131030'
  );

  // 11.4 Incoming Webhook edge case: Delivery failure status update
  const sampleMsg = db.recordMessage({
    userId: profile.userId,
    whatsappNumber: profile.whatsappNumber,
    direction: 'outgoing',
    messageType: 'text',
    content: 'Solve this quiz question',
    rawPayload: { wamid: 'wamid.test_delivery_receipt_123' },
  });

  const mockReqStatusPayload: any = {
    body: {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba_1',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: 'wamid.test_delivery_receipt_123',
                    status: 'failed',
                    timestamp: '1700000000',
                    recipient_id: profile.whatsappNumber,
                    errors: [
                      {
                        code: 131026,
                        title: 'Message Undeliverable',
                        message: 'Recipient is not on WhatsApp',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };

  let hookStatus = 0;
  const mockResHook: any = {
    status: (code: number) => {
      hookStatus = code;
      return { json: () => {} };
    },
  };

  await handleIncomingWebhook(mockReqStatusPayload, mockResHook);
  assert(hookStatus === 200, 'Incoming webhook returns HTTP 200 OK immediately');
  assert(sampleMsg.deliveryStatus === 'failed', 'Message delivery failure receipt successfully updated in DB');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
