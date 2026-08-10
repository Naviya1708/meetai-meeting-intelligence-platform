import { Link } from 'react-router-dom';
import {
  Mic, Sparkles, FileText, CheckSquare, Search, MessageSquare,
  Bell, BarChart3, Users, ArrowRight, Zap, Brain, Calendar,
  Shield, Clock, TrendingUp, AlertTriangle
} from 'lucide-react';

export function LandingPage() {
  const features = [
    { icon: FileText, title: 'AI Meeting Recap', desc: 'Quick summaries, detailed analysis, highlights, and professional meeting minutes — all generated automatically.' },
    { icon: CheckSquare, title: 'Smart Action Items', desc: 'AI extracts tasks, owners, deadlines, and priorities directly from your meeting transcripts.' },
    { icon: Search, title: 'RAG Knowledge Search', desc: 'Ask questions about past meetings. Semantic search finds relevant discussions across your entire history.' },
    { icon: MessageSquare, title: 'AI Meeting Chat', desc: 'Chat with an AI assistant that knows your meetings, tasks, and decisions. Get instant answers.' },
    { icon: Bell, title: 'Smart Reminders', desc: 'Automated deadline tracking, overdue alerts, and follow-up suggestions keep your team on track.' },
    { icon: BarChart3, title: 'Meeting Analytics', desc: 'Track meeting hours, task completion rates, productivity trends, and speaker participation.' },
    { icon: Users, title: 'Speaker Analytics', desc: 'See who contributed what, speaking time distribution, and participation balance across meetings.' },
    { icon: Brain, title: 'AI Insights', desc: 'Recurring blocker detection, deadline-risk prediction, and personalized follow-up plans.' },
  ];

  const pipeline = [
    { icon: Mic, label: 'Meeting', desc: 'Record or upload audio' },
    { icon: FileText, label: 'Transcript', desc: 'AI speech-to-text' },
    { icon: Brain, label: 'AI Analysis', desc: 'Understand & extract' },
    { icon: CheckSquare, label: 'Action Items', desc: 'Tasks with owners' },
    { icon: TrendingUp, label: 'Intelligence', desc: 'Insights & analytics' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">MeetAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">How it works</a>
            <a href="#workflow" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Workflow</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-100 rounded-full blur-3xl opacity-40" />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-powered meeting intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
            Turn every meeting into<br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              actionable intelligence
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Transform conversations into summaries, decisions, action items, insights, and searchable organizational knowledge — automatically.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/20">
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 transition-colors">
              Sign in
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> Secure & private</div>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> Instant analysis</div>
            <div className="flex items-center gap-2"><Brain className="w-4 h-4" /> AI-powered</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-600">From raw conversation to structured intelligence in five steps.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {pipeline.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <step.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">{step.label}</h3>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
                {i < pipeline.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 -translate-y-1/2 text-slate-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Why MeetAI?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              More than a summarizer. MeetAI is a complete meeting intelligence platform with standout AI features.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feat) => (
              <div key={feat.title} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <feat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">The complete pipeline</h2>
            <p className="text-slate-600">Every meeting flows through this intelligence pipeline.</p>
          </div>
          <div className="space-y-4">
            {[
              { icon: Mic, title: 'Capture', desc: 'Upload a recording or connect live audio. MeetAI accepts common audio formats.' },
              { icon: FileText, title: 'Transcribe', desc: 'Speech-to-text generates a timestamped, speaker-labeled transcript automatically.' },
              { icon: Brain, title: 'Analyze', desc: 'AI extracts summaries, decisions, topics, highlights, and key discussion points.' },
              { icon: CheckSquare, title: 'Extract Action Items', desc: 'Tasks are identified with owners, deadlines, and priorities — ready to track.' },
              { icon: Search, title: 'Search & Chat', desc: 'Ask questions about any past meeting. RAG retrieval finds the right context.' },
              { icon: TrendingUp, title: 'Track & Improve', desc: 'Analytics, insights, and reminders keep your team productive and accountable.' },
            ].map((step, i) => (
              <div key={step.title} className="flex items-start gap-4 bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="w-4 h-4 text-blue-600" />
                    <h3 className="text-base font-semibold text-slate-800">{step.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Standout features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Standout AI features</h2>
            <p className="text-slate-600">What makes MeetAI more than a meeting summarizer.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: Search, title: 'RAG-Based Historical Search', desc: 'Ask "What did we decide about the API?" and get answers from past meeting transcripts with source references.' },
              { icon: MessageSquare, title: 'AI Meeting Chat Assistant', desc: 'Chat with an AI that knows your meetings. Ask about tasks, decisions, or any topic discussed.' },
              { icon: AlertTriangle, title: 'Recurring Blocker Detection', desc: 'AI identifies issues that keep coming up across multiple meetings and surfaces them proactively.' },
              { icon: Clock, title: 'Deadline-Risk Prediction', desc: 'Tasks are classified as low, medium, or high risk based on deadlines, status, and priority.' },
              { icon: Calendar, title: 'Personalized Follow-up Plans', desc: 'After each meeting, get a plan with tasks, contacts, deadlines, and suggested follow-ups.' },
              { icon: TrendingUp, title: 'Productivity Intelligence', desc: 'Track completion rates, meeting efficiency, and trends to improve how your team works.' },
            ].map((feat) => (
              <div key={feat.title} className="flex items-start gap-4 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-5">
                <div className="flex-shrink-0 w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
                  <feat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800 mb-1">{feat.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Make every meeting more productive.
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              Join teams using MeetAI to turn conversations into actionable intelligence.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-medium rounded-xl hover:bg-slate-100 transition-colors">
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">MeetAI</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 MeetAI — AI Meeting Intelligence Platform</p>
        </div>
      </footer>
    </div>
  );
}
