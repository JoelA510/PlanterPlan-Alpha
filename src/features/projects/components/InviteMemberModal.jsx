import { useState } from 'react';
import ReactDOM from 'react-dom';
import { inviteMember, inviteMemberByEmail } from '@features/projects/services/projectService';
import { ROLES } from '@app/constants/index';

const InviteMemberModal = ({ project, onClose, onInviteSuccess }) => {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState(ROLES.VIEWER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId.trim()) {
      console.warn('[InviteMemberModal] User ID empty');
      return;
    }

    // Updated Logic: Check for Email OR UUID
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const UUID_REGEX =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    if (!EMAIL_REGEX.test(userId) && !UUID_REGEX.test(userId)) {
      setError('Please enter a valid Email Address or UUID.');
      return;
    }

    const isEmail = userId.includes('@');

    setIsSubmitting(true);
    setError(null);

    let result;
    if (isEmail) {
      result = await inviteMemberByEmail(project.id, userId, role);
    } else {
      result = await inviteMember(project.id, userId, role);
    }

    const { error: inviteError } = result;

    if (inviteError) {
      const msg =
        inviteError.message ||
        (typeof inviteError === 'string' ? inviteError : JSON.stringify(inviteError));
      console.error('[InviteMemberModal] Invite Failed:', msg);
      setError(msg || 'Failed to invite member (Unknown Error)');
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setSuccess(true);
      if (onInviteSuccess) onInviteSuccess();

      // Fix UX-04: Delay closure to show success state
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl transform transition-all">
        <h2 className="text-lg font-semibold text-slate-900">Invite Member</h2>
        <p className="mt-1 text-sm text-slate-500">
          Invite a user to <strong>{project.title}</strong>
        </p>

        {error && <div className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
        {success && (
          <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">
            Invitation sent successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-slate-700">
              User Email or UUID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:text-sm form-input p-2 border"
              placeholder="user@example.com or UUID"
              required
            />
            <p className="mt-1 text-xs text-slate-400">Enter the email of an existing user.</p>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm form-select p-2 border"
            >
              <option value={ROLES.VIEWER}>Viewer (Read-only)</option>
              <option value={ROLES.EDITOR}>Editor (Can edit tasks)</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default InviteMemberModal;
