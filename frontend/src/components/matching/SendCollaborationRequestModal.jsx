import React, { useState } from 'react';
import { Send, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { sendCollaborationRequest } from '../../api/client';
import { getScoreTier } from '../../utils/matchingHelpers';

/**
 * Modal dialog for proposing or sending a collaboration request.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onSuccess
 * @param {'project'|'study_buddy'|'skillswap'} props.mode
 * @param {Object} props.target
 */
export function SendCollaborationRequestModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  target,
}) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !target) return null;

  const scoreTier = target.score !== undefined ? getScoreTier(target.score) : null;

  const titleByMode = {
    project: 'Request to Collaborate on Project',
    study_buddy: 'Send Study Buddy Request',
    skillswap: 'Propose SkillSwap Exchange',
  };

  const placeholderByMode = {
    project:
      'Introduce yourself, share your relevant skills or experience, and explain how you can contribute to this project...',
    study_buddy:
      'Mention your target study schedule, course topics you want to focus on, or how you like to study...',
    skillswap:
      'Describe what you would like to learn, what you can teach in return, and your preferred meeting times...',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        mode,
        projectId: mode === 'project' ? target.projectId : undefined,
        recipientId: mode !== 'project' ? target.recipientId : undefined,
        message: message.trim() || undefined,
      };

      const result = await sendCollaborationRequest(payload);
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err) {
      setError(
        err.message || 'Failed to send collaboration request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-section/50">
          <div>
            <h3 className="font-serif text-lg font-medium text-text-main">
              {titleByMode[mode] || 'Send Collaboration Request'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Send an invitation with server-verified compatibility scoring.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded text-text-muted hover:text-text-main hover:bg-bg-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Summary Card */}
          <div className="p-3 rounded border border-border/80 bg-bg-section/30 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-text-main line-clamp-1">
                {mode === 'project' ? target.projectTitle : target.studentName}
              </span>
              {scoreTier && (
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${scoreTier.badgeClass}`}
                >
                  {target.score}% Match · {scoreTier.label}
                </span>
              )}
            </div>
            {mode === 'project' && (
              <p className="text-[11px] text-text-muted">
                Project owner:{' '}
                <span className="text-text-main font-medium">{target.ownerName || 'Owner'}</span>
              </p>
            )}
            {mode === 'study_buddy' && target.courseCode && (
              <p className="text-[11px] text-text-muted">
                Course focus:{' '}
                <span className="text-text-main font-medium">{target.courseCode}</span>
              </p>
            )}
          </div>

          {/* Optional Intro Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="request-message" className="font-medium text-text-main">
                Personalized Note <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              <span
                className={`text-[10px] ${
                  message.length > 500 ? 'text-red-500 font-bold' : 'text-text-muted'
                }`}
              >
                {message.length}/500
              </span>
            </div>
            <textarea
              id="request-message"
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholderByMode[mode]}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded border border-border bg-bg-page text-text-main placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50 resize-none transition-colors"
            />
            <p className="text-[10px] text-text-muted">
              Your profile and compatibility snapshot will automatically be attached to the request.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-medium block">Unable to send request</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || message.length > 500}
              className="inline-flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SendCollaborationRequestModal;
