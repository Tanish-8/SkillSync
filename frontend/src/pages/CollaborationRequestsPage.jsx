import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Send,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  User,
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FactorBreakdown } from '../components/matching/FactorBreakdown';
import { WhyThisMatch } from '../components/matching/WhyThisMatch';
import { getScoreTier } from '../utils/matchingHelpers';
import {
  getSentCollaborationRequests,
  getReceivedCollaborationRequests,
  respondToCollaborationRequest,
  cancelCollaborationRequest,
} from '../api/client';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Declined' },
  { id: 'cancelled', label: 'Cancelled' },
];

const MODE_LABELS = {
  project: { label: 'Project Collaboration', badgeClass: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
  study_buddy: { label: 'Study Buddy', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  skillswap: { label: 'SkillSwap Exchange', badgeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
};

export function CollaborationRequestsPage() {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [statusFilter, setStatusFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRequests: 0, totalPages: 1, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [actionInProgressId, setActionInProgressId] = useState(null);

  const fetchRequests = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const fetcher = activeTab === 'received' ? getReceivedCollaborationRequests : getSentCollaborationRequests;
        const res = await fetcher({
          page,
          limit: 10,
          status: statusFilter === 'all' ? undefined : statusFilter,
        });
        setRequests(res?.requests || []);
        setPagination(
          res?.pagination || { page: 1, limit: 10, totalRequests: 0, totalPages: 1, hasMore: false }
        );
      } catch (err) {
        setError(err.message || 'Failed to load collaboration requests.');
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, statusFilter]
  );

  useEffect(() => {
    fetchRequests(1);
  }, [fetchRequests]);

  const handleRespond = async (requestId, action) => {
    setActionInProgressId(requestId);
    setError(null);
    setActionSuccessMessage(null);
    try {
      const updated = await respondToCollaborationRequest(requestId, action);
      setActionSuccessMessage(
        `Collaboration request ${action === 'accept' ? 'accepted' : 'declined'} successfully.`
      );
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: updated.status } : r))
      );
    } catch (err) {
      setError(err.message || `Failed to ${action} request.`);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this collaboration request?')) {
      return;
    }
    setActionInProgressId(requestId);
    setError(null);
    setActionSuccessMessage(null);
    try {
      const updated = await cancelCollaborationRequest(requestId);
      setActionSuccessMessage('Collaboration request cancelled successfully.');
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: updated.status } : r))
      );
    } catch (err) {
      setError(err.message || 'Failed to cancel request.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <Check className="w-3 h-3" />
            <span>Accepted</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-500 border border-red-500/30">
            <X className="w-3 h-3" />
            <span>Declined</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/30">
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-bg-section border border-border text-text-muted">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl font-normal text-text-main">Collaboration Requests</h1>
          <p className="text-xs text-text-muted mt-1">
            Manage your incoming invitations and track requests sent across Projects, Study Buddies, and SkillSwap.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchRequests(pagination.page)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMessage && (
        <div className="p-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="p-1 hover:text-text-main"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="p-1 hover:text-text-main">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b sm:border-b-0 border-border pb-2 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('received');
              setStatusFilter('all');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'received'
                ? 'bg-accent/20 text-text-main border border-accent/40 font-semibold'
                : 'text-text-muted hover:text-text-main hover:bg-bg-card'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Received Requests</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sent');
              setStatusFilter('all');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-accent/20 text-text-main border border-accent/40 font-semibold'
                : 'text-text-muted hover:text-text-main hover:bg-bg-card'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Sent Requests</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal className="w-3 h-3 text-text-muted shrink-0 mr-1" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`text-[11px] px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-text-main text-bg-page font-semibold'
                  : 'bg-bg-section border border-border text-text-muted hover:text-text-main'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-lg bg-bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center mx-auto text-text-muted">
            {activeTab === 'received' ? <Inbox className="w-6 h-6" /> : <Send className="w-6 h-6" />}
          </div>
          <h3 className="font-serif text-base font-medium text-text-main">
            {activeTab === 'received' ? 'No received requests' : 'No sent requests'}
          </h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            {statusFilter !== 'all'
              ? `There are no ${statusFilter} collaboration requests matching your filter.`
              : activeTab === 'received'
              ? 'When other students find your profile in recommendations, their invitations will appear here.'
              : 'You have not sent any collaboration requests yet. Explore Projects, Study Buddies, or SkillSwap to connect.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((req) => {
            const isReceived = activeTab === 'received';
            const partnerName = isReceived
              ? req.requester?.name || 'Student Candidate'
              : req.recipient?.name || 'Student Candidate';
            const modeConfig = MODE_LABELS[req.mode] || {
              label: req.mode,
              badgeClass: 'bg-bg-section text-text-muted border-border',
            };
            const snapshot = req.compatibilitySnapshot;
            const scoreTier = snapshot ? getScoreTier(snapshot.score) : null;

            return (
              <Card
                key={req.id}
                className="p-5 flex flex-col justify-between space-y-4 border-l-4 border-l-accent"
              >
                <div className="space-y-3">
                  {/* Top Bar: Partner, Mode, Status, Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-xs font-bold text-text-main">
                        {partnerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-text-main">
                            {partnerName}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${modeConfig.badgeClass}`}
                          >
                            {modeConfig.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted">
                          {isReceived ? 'Received from' : 'Sent to'}{' '}
                          <span className="text-text-main font-medium">{partnerName}</span> ·{' '}
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {renderStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Project Info if Project Mode */}
                  {req.mode === 'project' && req.project && (
                    <div className="flex items-center gap-2 p-2.5 rounded bg-bg-section/40 border border-border/70 text-xs">
                      <FolderGit2 className="w-4 h-4 text-accent shrink-0" />
                      <div>
                        <span className="text-[10px] text-text-muted uppercase tracking-wider block font-medium">
                          Associated Project
                        </span>
                        <span className="font-medium text-text-main">{req.project.title}</span>
                      </div>
                    </div>
                  )}

                  {/* Message Note */}
                  {req.message && (
                    <div className="p-3 rounded bg-bg-section/60 border border-border/80 text-xs text-text-main space-y-1">
                      <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-medium">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Personal Note:</span>
                      </div>
                      <p className="italic text-text-main pl-5 border-l-2 border-accent/50 text-[11px] leading-relaxed">
                        "{req.message}"
                      </p>
                    </div>
                  )}

                  {/* Server Compatibility Snapshot */}
                  {snapshot && (
                    <div className="p-3 rounded bg-bg-section/30 border border-border/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                          <span>Verified Compatibility Snapshot</span>
                        </span>
                        {scoreTier && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${scoreTier.badgeClass}`}
                          >
                            {snapshot.score}% Match · {scoreTier.label}
                          </span>
                        )}
                      </div>

                      {/* Factor Breakdown */}
                      {snapshot.factors && snapshot.factors.length > 0 && (
                        <FactorBreakdown factors={snapshot.factors} />
                      )}

                      {/* Reasons */}
                      {snapshot.reasons && snapshot.reasons.length > 0 && (
                        <WhyThisMatch reasons={snapshot.reasons} />
                      )}
                    </div>
                  )}

                  {/* Accepted Notice */}
                  {req.status === 'accepted' && (
                    <div className="p-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Collaboration Accepted</span>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                          You are now connected! Coordinate meeting times and project workflows through your preferred student communication tools.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">
                    Request ID: <span className="font-mono">{req.id.slice(-8)}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Received pending actions: Accept & Decline */}
                    {isReceived && req.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespond(req.id, 'reject')}
                          disabled={actionInProgressId === req.id}
                          className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRespond(req.id, 'accept')}
                          disabled={actionInProgressId === req.id}
                          className="text-xs inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept Invitation</span>
                        </Button>
                      </>
                    )}

                    {/* Sent pending actions: Cancel */}
                    {!isReceived && req.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(req.id)}
                        disabled={actionInProgressId === req.id}
                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-text-muted">
          <span>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalRequests} total requests)
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => fetchRequests(pagination.page - 1)}
              className="inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!pagination.hasMore || isLoading}
              onClick={() => fetchRequests(pagination.page + 1)}
              className="inline-flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollaborationRequestsPage;
