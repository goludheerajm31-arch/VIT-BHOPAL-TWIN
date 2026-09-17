import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Layers,
  Sparkles,
  Bot,
  Send,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building,
  Navigation,
  Flame,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [assistantInput, setAssistantInput] = useState('Where is my AI Club workshop?');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'user',
      text: 'Where is my AI Club workshop?',
    },
    {
      role: 'assistant',
      text: 'Your AI Club Workshop is in Seminar Hall (AB-1 Ground Floor). It is approximately 420 m from the Central Library and takes about 5 minutes to walk. The event is scheduled today from 4:00 PM – 6:00 PM and is published by the verified AI & ML Club.',
    },
  ]);

  const handleSendQuery = (promptText?: string) => {
    const textToSend = promptText || assistantInput;
    if (!textToSend.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, text: textToSend }];

    let reply =
      'I can guide you anywhere on campus! In Phase 3, this AI Assistant will link dynamically with real-time campus sensors and event timetables.';
    if (textToSend.toLowerCase().includes('library')) {
      reply =
        'The Central Library & Digital Repository is located in the Learning Resource Center, 1st & 2nd floors. Open today until 10:30 PM.';
    } else if (textToSend.toLowerCase().includes('food') || textToSend.toLowerCase().includes('lunch')) {
      reply =
        'Central Food Court & Dining Square is currently open at Central Plaza. It is about 3 minutes walk from Academic Block 1.';
    } else if (textToSend.toLowerCase().includes('ai') || textToSend.toLowerCase().includes('workshop')) {
      reply =
        'Your AI Club Workshop is in Seminar Hall (AB-1 Ground Floor). It is approximately 420 m from the Central Library and takes about 5 minutes to walk.';
    }

    setMessages([...newMessages, { role: 'assistant' as const, text: reply }]);
    setAssistantInput('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Title & Core Philosophy */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <Sparkles className="w-3.5 h-3.5" /> Concept & Architecture
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Why build a Digital Twin for VIT Bhopal?
        </h1>

        <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium">
          "The physical campus already contains the information. The challenge is making it easy to access at the right moment."
        </p>
      </div>

      {/* Problems vs Opportunity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-xs space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-600">The Problem</div>
          <h3 className="font-bold text-base text-slate-900">Fragmented Physical Campus Reality</h3>
          <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">•</span>
              <span>Finding buildings, lecture halls, and specialized labs can be confusing and time-consuming.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">•</span>
              <span>Event details are scattered across disparate chat groups, PDF notices, and social channels.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">•</span>
              <span>Freshers, guests, and visiting dignitaries lack real-time campus pedestrian navigation.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">•</span>
              <span>No authoritative digital layer binds physical place + schedule + institutional trust.</span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-blue-100 shadow-xs space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600">The Opportunity</div>
          <h3 className="font-bold text-base text-slate-900">An Intelligent Information Layer</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            "Turn the campus into an interactive information layer."
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            By geo-referencing all 16+ core university facilities and binding them directly to live club timetables, walking path networks, and administrative verification, every student experiences a unified, authoritative interface.
          </p>
          <div className="pt-1">
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Explore the working MVP <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3-Tier Digital Twin Architecture Diagram */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white space-y-6 shadow-xl">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
            System Architecture
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            The Digital Twin Paradigm
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            "The point is not just a 3D model. The point is a useful digital layer over the real VIT Bhopal campus."
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase text-amber-400">Layer 1</div>
              <div className="font-bold text-sm text-white">PHYSICAL CAMPUS</div>
              <div className="text-xs text-slate-400">Buildings · Roads · Labs · Sports Arenas · Facilities</div>
            </div>
            <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded">Physical Assets</span>
          </div>

          <div className="flex justify-center text-blue-400">
            <ArrowRight className="w-5 h-5 rotate-90" />
          </div>

          <div className="p-4 rounded-xl bg-slate-800/90 border border-blue-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase text-blue-400">Layer 2</div>
              <div className="font-bold text-sm text-white">DIGITAL TWIN (This Platform)</div>
              <div className="text-xs text-slate-300">Geo-Locations · Live Events · Footpaths · Verified Publishers · RBAC</div>
            </div>
            <span className="text-xs text-blue-300 bg-blue-950 px-2.5 py-1 rounded border border-blue-800">
              Active MVP
            </span>
          </div>

          <div className="flex justify-center text-blue-400">
            <ArrowRight className="w-5 h-5 rotate-90" />
          </div>

          <div className="p-4 rounded-xl bg-slate-800/90 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase text-emerald-400">Layer 3</div>
              <div className="font-bold text-sm text-white">SMART EXPERIENCE</div>
              <div className="text-xs text-slate-300">Instant Search · Walking Navigation · Discovery · Institutional Trust</div>
            </div>
            <span className="text-xs text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
              Delivered
            </span>
          </div>
        </div>
      </div>

      {/* Future Roadmap */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Future Roadmap</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
            <div className="font-bold text-blue-800">PHASE 1 (MVP)</div>
            <div className="font-semibold text-slate-900">Core Digital Twin</div>
            <p className="text-[11px] text-slate-600">Map, Search, Locations, Events, Navigation, Trust.</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              ✓ COMPLETED
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
            <div className="font-bold text-slate-400">PHASE 2</div>
            <div className="font-semibold text-slate-800">3D Campus Mesh</div>
            <p className="text-[11px] text-slate-500">Three.js / WebGL architectural elevation models.</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Upcoming
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
            <div className="font-bold text-slate-400">PHASE 3</div>
            <div className="font-semibold text-slate-800">AI Assistant</div>
            <p className="text-[11px] text-slate-500">Natural language spatial reasoning & routing.</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Interactive Preview
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
            <div className="font-bold text-slate-400">PHASE 4</div>
            <div className="font-semibold text-slate-800">Campus Analytics</div>
            <p className="text-[11px] text-slate-500">Heatmaps of pedestrian footfall & event capacity.</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Planned
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
            <div className="font-bold text-slate-400">PHASE 5</div>
            <div className="font-semibold text-slate-800">IoT Integration</div>
            <p className="text-[11px] text-slate-500">Live lab occupancy, cafeteria queues & parking slots.</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Planned
            </span>
          </div>
        </div>
      </div>

      {/* Section 31: FUTURE AI ASSISTANT "Coming Soon" Simulation */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-4 shadow-lg border border-indigo-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Coming Soon · Phase 3 Teaser
              </div>
              <h3 className="text-lg font-bold text-white">AI Campus Assistant Simulation</h3>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2.5 py-1 rounded-full">
            Interactive Demo
          </span>
        </div>

        {/* Conversation Box */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3 max-h-60 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 text-xs ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-xl leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-700 text-slate-100 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="text-slate-400 self-center">Try asking:</span>
          {[
            'Where is my AI Club workshop?',
            'When does the Central Library close?',
            'Where is the Food Court?',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendQuery(prompt)}
              className="px-2.5 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
            placeholder="Ask about venues, events, or walking times..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={() => handleSendQuery()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
