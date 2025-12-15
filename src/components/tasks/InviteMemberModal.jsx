import React, { useState } from 'react';
import { inviteMember } from '../../services/projectService';

const InviteMemberModal = ({ project, onClose, onInviteSuccess }) => {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [success, setSuccess] = useState(false);

  // Fix UX-01: Client-side UUID Regex
  const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim()) return;

    if (!UUID_REGEX.test(userId)) {
      setError('Invalid UUID format. Please check the ID.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: inviteError } = await inviteMember(project.id, userId, role);

    if (inviteError) {
      setError(inviteError.message || 'Failed to invite member');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Invite Member</h2>
        <p className="mt-1 text-sm text-slate-500">
          Invite a user to <strong>{project.title}</strong>
        </p>

        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {success && (
          <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
            Invitation sent successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-slate-700">
              User ID (UUID)
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm form-input"
              placeholder="e.g. 123e4567-e89b..."
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              Enter the exact UUID of the user. (Future: Email lookup)
            </p>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm form-select"
            >
              <option value="viewer">Viewer (Read-only)</option>
              <option value="editor">Editor (Can edit tasks)</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberModal;
