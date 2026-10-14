import React, { useState } from 'react';
import { portfolioData } from '../../data/portfolioData';
import { 
  X, 
  Mail, 
  Github, 
  Linkedin, 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Send 
} from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const { personal } = portfolioData;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(personal.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderEmail || !message) return;
    setMessageSent(true);
    setTimeout(() => {
      setMessageSent(false);
      onClose();
    }, 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B1B2D]/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#FFF8E7] rounded-2xl max-w-xl w-full max-h-[92dvh] overflow-y-auto border-2 border-[#0B1B2D] shadow-[8px_8px_0_#0B1B2D] p-5 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-[#0B1B2D] shadow-[2px_2px_0_#0B1B2D] text-[#0B1B2D] hover:bg-amber-50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#0B1B2D] cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider font-sans bg-white border border-[#0B1B2D] px-2 py-0.5 rounded shadow-[1.5px_1.5px_0_#0B1B2D] inline-block mb-1">
            VERIFIED CHANNELS
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#0B1B2D] tracking-tight mt-1 leading-snug">
            Connect with Sharanya
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] mt-1.5 leading-normal font-sans font-medium">
            Backend & blockchain development, smart contracts, and hackathons.
          </p>
        </div>

        {/* 4 Verified Contact Buttons */}
        <div className="space-y-3 mb-6">
          {/* 1. Email */}
          <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D]">
            <a
              href={`mailto:${personal.email}`}
              className="flex-1 flex items-center gap-3 text-[#0B1B2D] hover:text-[#0F766E] transition-colors min-w-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1AA6A6] text-white flex items-center justify-center shrink-0 border border-[#0B1B2D]">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold text-[#0B1B2D] leading-tight font-sans">Email Address</div>
                <div className="text-xs sm:text-sm text-[#475569] font-medium truncate mt-0.5">{personal.email}</div>
              </div>
            </a>
            <button
              onClick={handleCopyEmail}
              className="btn-chunky-light px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0"
              title="Copy email address"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* 2. GitHub */}
          <a
            href={personal.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D] hover:bg-amber-50/50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0B1B2D] cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1AA6A6] text-white flex items-center justify-center shrink-0 border border-[#0B1B2D]">
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold text-[#0B1B2D] leading-tight font-sans">GitHub Profile</div>
                <div className="text-xs sm:text-sm text-[#475569] font-medium truncate mt-0.5">@sharanyashetty013-droid</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-[#64748B] group-hover:text-[#0B1B2D] transition-colors shrink-0 ml-2" />
          </a>

          {/* 3. LinkedIn */}
          <a
            href={personal.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D] hover:bg-amber-50/50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0B1B2D] cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 border border-[#0B1B2D]">
                <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold text-[#0B1B2D] leading-tight font-sans">LinkedIn Profile</div>
                <div className="text-xs sm:text-sm text-[#475569] font-medium truncate mt-0.5">sharanya-l-shetty-81156a424</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-[#64748B] group-hover:text-[#0B1B2D] transition-colors shrink-0 ml-2" />
          </a>

          {/* 4. LeetCode */}
          <a
            href={personal.leetcode}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white border-2 border-[#0B1B2D] shadow-[3px_3px_0_#0B1B2D] hover:bg-amber-50/50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0B1B2D] cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 border border-[#0B1B2D]">
                <Code2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold text-[#0B1B2D] leading-tight font-sans">LeetCode Profile</div>
                <div className="text-xs sm:text-sm text-[#475569] font-medium truncate mt-0.5">Sharanya_Shetty01</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-[#64748B] group-hover:text-[#0B1B2D] transition-colors shrink-0 ml-2" />
          </a>
        </div>

        {/* Quick Note Form */}
        <form onSubmit={handleSubmit} className="border-t-2 border-[#0B1B2D]/20 pt-4 space-y-3">
          <div className="text-sm sm:text-base font-bold text-[#0B1B2D] font-sans">Or send a quick message:</div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <input
              type="text"
              placeholder="Your Name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="h-[44px] px-3.5 text-sm placeholder:text-slate-400 text-[#0B1B2D] bg-white border-2 border-[#0B1B2D] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1AA6A6] font-sans font-medium"
            />
            <input
              type="email"
              required
              placeholder="Your Email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="h-[44px] px-3.5 text-sm placeholder:text-slate-400 text-[#0B1B2D] bg-white border-2 border-[#0B1B2D] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1AA6A6] font-sans font-medium"
            />
          </div>
          <textarea
            required
            rows={3}
            placeholder="Hi Sharanya, let's discuss..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full min-h-[90px] p-3 text-sm placeholder:text-slate-400 text-[#0B1B2D] bg-white border-2 border-[#0B1B2D] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1AA6A6] resize-none font-sans font-medium"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#64748B] font-semibold font-sans">Direct response</span>
            <button
              type="submit"
              disabled={messageSent}
              className="btn-chunky-teal inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl"
            >
              {messageSent ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Message Sent!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
