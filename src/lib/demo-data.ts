import { supabase } from '@/lib/supabase';
import { analyzeTranscript } from '@/lib/ai-engine';
import type { TranscriptSegment } from '@/types';

const demoMeetings: {
  title: string;
  description: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  participants: string[];
  agenda: string;
  status: string;
  segments: TranscriptSegment[];
}[] = [
  {
    title: 'Project Sprint Planning Meeting',
    description: 'Sprint planning for Q1 product roadmap, covering API development, login module, dashboard UI, testing, and deployment.',
    meeting_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:30',
    duration_minutes: 90,
    participants: ['Arun Sharma', 'Priya Patel', 'Rahul Verma', 'Sneha Gupta'],
    agenda: '1. API development status\n2. Login module review\n3. Dashboard UI progress\n4. Testing plan\n5. Deployment timeline',
    status: 'completed',
    segments: [
      { speaker: 'Arun Sharma', text: 'Welcome everyone to the sprint planning meeting. Today we need to review our progress on the API development, login module, dashboard UI, testing, and deployment timeline.', start: 0, end: 15 },
      { speaker: 'Arun Sharma', text: 'Let\'s start with the API development. Rahul, can you give us an update on the backend API?', start: 15, end: 30 },
      { speaker: 'Rahul Verma', text: 'The API development is progressing well. We have completed the user authentication endpoints and the product catalog API. However, the payment integration API is still pending. We need to integrate Stripe for payment processing.', start: 30, end: 55 },
      { speaker: 'Arun Sharma', text: 'Good progress. When can you complete the payment integration API?', start: 55, end: 65 },
      { speaker: 'Rahul Verma', text: 'I will complete the payment integration API by Friday. It is high priority since the checkout flow depends on it.', start: 65, end: 80 },
      { speaker: 'Arun Sharma', text: 'Great. We decided to use Stripe for payment processing. Rahul, please complete the payment integration API by Friday.', start: 80, end: 100 },
      { speaker: 'Arun Sharma', text: 'Now let\'s move to the login module. Priya, how is the login module coming along?', start: 100, end: 115 },
      { speaker: 'Priya Patel', text: 'The login module is almost complete. I have implemented the email and password login flow. However, we have an issue with the JWT token refresh logic. The tokens are expiring too quickly and users are getting logged out.', start: 115, end: 145 },
      { speaker: 'Arun Sharma', text: 'That sounds like a blocker. Can you fix the JWT token refresh issue?', start: 145, end: 155 },
      { speaker: 'Priya Patel', text: 'Yes, I will fix the JWT token refresh issue by Wednesday. It is critical because users are getting logged out frequently.', start: 155, end: 175 },
      { speaker: 'Arun Sharma', text: 'Good. Priya, please fix the JWT token refresh issue by Wednesday. That is a critical priority.', start: 175, end: 195 },
      { speaker: 'Arun Sharma', text: 'Now let\'s discuss the dashboard UI. Sneha, can you update us on the frontend?', start: 195, end: 210 },
      { speaker: 'Sneha Gupta', text: 'The dashboard UI is looking great. I have completed the main dashboard layout, the analytics charts, and the meeting list page. The design is clean and modern. However, the UI for the settings page still needs work. I need to design the notification preferences and AI preferences sections.', start: 210, end: 250 },
      { speaker: 'Arun Sharma', text: 'Good work on the dashboard UI. When can you finish the settings page?', start: 250, end: 260 },
      { speaker: 'Sneha Gupta', text: 'I will complete the settings page UI by next Monday. It is medium priority since the core dashboard is already done.', start: 260, end: 280 },
      { speaker: 'Arun Sharma', text: 'Great. Sneha, please complete the settings page UI by next Monday.', start: 280, end: 295 },
      { speaker: 'Arun Sharma', text: 'Let\'s talk about testing. Rahul, what is the testing status?', start: 295, end: 310 },
      { speaker: 'Rahul Verma', text: 'We have written unit tests for the authentication module and the product API. However, we are blocked on integration testing because the payment integration API is not complete yet. We need the payment API before we can write end-to-end tests for the checkout flow.', start: 310, end: 345 },
      { speaker: 'Arun Sharma', text: 'That is a dependency on the payment integration. Once Rahul completes the payment API, we can proceed with integration testing. Rahul, please also write integration tests for the checkout flow after completing the payment API.', start: 345, end: 375 },
      { speaker: 'Rahul Verma', text: 'I will write integration tests for the checkout flow by next Friday after completing the payment integration.', start: 375, end: 395 },
      { speaker: 'Arun Sharma', text: 'Finally, let\'s discuss the deployment timeline. We agreed to deploy the initial version by the end of this month. We need the payment integration, the JWT fix, and the settings page to be complete before deployment.', start: 395, end: 425 },
      { speaker: 'Arun Sharma', text: 'We decided to deploy the initial version by the end of this month. Everyone please ensure your tasks are completed on time. Let\'s schedule a follow-up meeting next week to review progress.', start: 425, end: 455 },
      { speaker: 'Arun Sharma', text: 'I will schedule a follow-up meeting for next Tuesday to review progress on all action items. Thank you everyone for the great discussion today.', start: 455, end: 480 },
    ],
  },
  {
    title: 'Weekly Team Standup',
    description: 'Weekly progress check on ongoing tasks and blockers.',
    meeting_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '09:30',
    duration_minutes: 30,
    participants: ['Arun Sharma', 'Rahul Verma', 'Priya Patel'],
    agenda: '1. Progress updates\n2. Blockers\n3. Next steps',
    status: 'completed',
    segments: [
      { speaker: 'Arun Sharma', text: 'Good morning team. Let\'s do a quick standup. Rahul, start with your updates.', start: 0, end: 10 },
      { speaker: 'Rahul Verma', text: 'I have been working on the API development. The user authentication endpoints are complete and working well. However, the payment integration API is still pending. It is blocked because we are waiting on the Stripe API keys from the finance team.', start: 10, end: 35 },
      { speaker: 'Arun Sharma', text: 'That is a blocker on the payment integration. I will follow up with the finance team to get the Stripe API keys. Rahul, please continue with the other API endpoints in the meantime.', start: 35, end: 55 },
      { speaker: 'Arun Sharma', text: 'Priya, what is your update?', start: 55, end: 60 },
      { speaker: 'Priya Patel', text: 'I have been working on the login module. The email and password login is complete. I found a bug in the JWT token refresh logic. The tokens are expiring after 1 hour instead of 24 hours. I will fix this by today.', start: 60, end: 85 },
      { speaker: 'Arun Sharma', text: 'Good. Priya, please fix the JWT token refresh bug today. That is high priority.', start: 85, end: 100 },
      { speaker: 'Arun Sharma', text: 'Overall, the API integration is blocked on Stripe keys and the JWT refresh bug needs to be fixed. Let\'s check in again on Friday.', start: 100, end: 120 },
    ],
  },
  {
    title: 'Product Design Review',
    description: 'Review of the new dashboard design and user feedback.',
    meeting_date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '15:00',
    duration_minutes: 60,
    participants: ['Sneha Gupta', 'Arun Sharma', 'Priya Patel'],
    agenda: '1. Dashboard design review\n2. User feedback\n3. Next design steps',
    status: 'completed',
    segments: [
      { speaker: 'Sneha Gupta', text: 'Today we are reviewing the new dashboard design. I have created a modern, clean layout with a sidebar navigation, analytics charts, and a meeting list. The design uses a blue and slate color palette for a professional look.', start: 0, end: 25 },
      { speaker: 'Arun Sharma', text: 'The dashboard design looks fantastic. The layout is clean and the analytics charts are well-placed. I like the use of cards and the color scheme.', start: 25, end: 45 },
      { speaker: 'Priya Patel', text: 'I agree, the design is great. One suggestion is to add a quick action button in the top navigation for creating new meetings. It would improve the user experience.', start: 45, end: 65 },
      { speaker: 'Sneha Gupta', text: 'That is a good suggestion. I will add a quick action button to the top navigation. I should have it done by Thursday.', start: 65, end: 85 },
      { speaker: 'Arun Sharma', text: 'We agreed on the dashboard design direction. Sneha, please add the quick action button by Thursday and finalize the design.', start: 85, end: 105 },
      { speaker: 'Sneha Gupta', text: 'I will also create a design for the settings page. The notification preferences and AI preferences sections need to be designed. I will have those ready by next week.', start: 105, end: 130 },
      { speaker: 'Arun Sharma', text: 'Great work on the dashboard design. The design is approved. Let\'s move forward with implementation.', start: 130, end: 145 },
    ],
  },
  {
    title: 'Client Requirements Gathering',
    description: 'Meeting with client to gather requirements for the next phase.',
    meeting_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    start_time: '11:00',
    end_time: '12:00',
    duration_minutes: 60,
    participants: ['Arun Sharma', 'Client Team'],
    agenda: '1. Current progress review\n2. New requirements\n3. Timeline discussion',
    status: 'scheduled',
    segments: [],
  },
  {
    title: 'Code Review Session',
    description: 'Review of pull requests and code quality discussion.',
    meeting_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    start_time: '15:00',
    end_time: '16:00',
    duration_minutes: 60,
    participants: ['Rahul Verma', 'Priya Patel', 'Sneha Gupta'],
    agenda: '1. PR review\n2. Code quality\n3. Best practices',
    status: 'scheduled',
    segments: [],
  },
];

export async function seedDemoData(userId: string) {
  // Check if demo data already exists
  const { data: existing } = await supabase
    .from('meetings')
    .select('id')
    .limit(1);
  if (existing && existing.length > 0) return false;

  for (const demo of demoMeetings) {
    const { data: meeting, error: mError } = await supabase
      .from('meetings')
      .insert({
        user_id: userId,
        title: demo.title,
        description: demo.description,
        meeting_date: demo.meeting_date,
        start_time: demo.start_time,
        end_time: demo.end_time,
        duration_minutes: demo.duration_minutes,
        participants: demo.participants,
        agenda: demo.agenda,
        status: demo.status,
      })
      .select('*')
      .maybeSingle();

    if (mError || !meeting) continue;

    // Save transcript if segments exist
    if (demo.segments.length > 0) {
      const fullText = demo.segments.map((s) => s.text).join(' ');
      await supabase.from('transcripts').insert({
        meeting_id: meeting.id,
        full_text: fullText,
        segments: demo.segments,
      });

      // Analyze the meeting
      const result = analyzeTranscript(
        demo.segments,
        demo.title,
        demo.participants,
        demo.duration_minutes,
        meeting.id
      );

      // Save summary
      await supabase.from('summaries').insert({
        meeting_id: meeting.id,
        ...result.summary,
      });

      // Save decisions
      if (result.decisions.length > 0) {
        await supabase.from('decisions').insert(result.decisions);
      }

      // Save topics
      if (result.topics.length > 0) {
        await supabase.from('topics').insert(result.topics);
      }

      // Save action items
      if (result.actionItems.length > 0) {
        await supabase.from('action_items').insert(result.actionItems);
      }

      // Save sentiment
      await supabase.from('sentiment_analysis').insert(result.sentiment);

      // Save insights
      if (result.insights.length > 0) {
        await supabase.from('ai_insights').insert(result.insights);
      }
    }
  }

  // Create some notifications
  const notifications = [
    { user_id: userId, type: 'task_reminder', title: 'Task deadline approaching', message: 'Payment integration API is due in 2 days', read: false },
    { user_id: userId, type: 'meeting_reminder', title: 'Upcoming meeting', message: 'Client Requirements Gathering is in 2 days', read: false },
    { user_id: userId, type: 'task_assigned', title: 'New task assigned', message: 'You have been assigned: Fix JWT token refresh issue', read: false },
    { user_id: userId, type: 'overdue', title: 'Task overdue', message: 'Complete settings page UI is past its deadline', read: true },
  ];
  await supabase.from('notifications').insert(notifications);

  return true;
}
