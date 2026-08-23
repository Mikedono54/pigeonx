import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { deleteMyAccount, renameBusiness } from '../lib/db';
import { demoWriteBlocked, isDemo, leaveDemo } from '../lib/demo';
import { Card, ErrorNote, Field, Input, Label, PageHead } from '../components/ui';
import { Dialog } from '../components/Dialog';

export default function Settings() {
  const { business, email, signOut, reloadBusinesses } = useAuth();
  const demo = isDemo();
  const navigate = useNavigate();
  const [name, setName] = useState(business?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const canRename = business?.role === 'owner';

  useEffect(() => {
    setName(business?.name ?? '');
  }, [business?.name]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (demo) demoWriteBlocked();
      await renameBusiness(business.org_id, name.trim());
      await reloadBusinesses();
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function removeAccount() {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError(new Error('Type DELETE to confirm.'));
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      if (demo) demoWriteBlocked();
      await deleteMyAccount();
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHead title="Settings" intro="Your business, your account, and the way out." />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-[18px] font-semibold">Business</h2>
          <form onSubmit={save} className="mt-4 space-y-4">
            <Field
              label="Business name"
              hint={canRename ? undefined : 'Only an owner can change this.'}
              htmlFor="settings-business"
            >
              <Input
                id="settings-business"
                value={name}
                required
                disabled={!canRename}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
              />
            </Field>
            <Button
              type="submit"
              disabled={!canRename || saving || name.trim() === (business?.name ?? '')}
            >
              {saving ? 'Saving' : 'Save the name'}
            </Button>
            <p role="status" aria-live="polite" className="min-h-5 text-[14px] text-accent">
              {saved ? 'Saved.' : ''}
            </p>
          </form>
          {error ? (
            <div className="mt-2">
              <ErrorNote error={error} />
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-[18px] font-semibold">Your account</h2>
          <div className="mt-4">
            <Label>Email</Label>
            <p className="mt-1.5 text-[16px] text-ink">{email ?? 'Not signed in'}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                leaveDemo();
                void signOut().then(() => navigate('/app/sign-in', { replace: true }));
              }}
            >
              Sign out
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-[18px] font-semibold">Delete my account</h2>
        <p className="mt-3 max-w-[62ch] text-[15px] text-muted">
          This removes your account and everything only you own. If you are the only owner of a
          business with other people in it, make someone else an owner first. This cannot be
          undone.
        </p>
        <div className="mt-5">
          <Button
            variant="secondary"
            className="border-[color:var(--px-danger)] text-[color:var(--px-danger)] hover:bg-[color:var(--px-danger)] hover:text-bg"
            onClick={() => {
              setConfirmText('');
              setDeleteError(null);
              setConfirming(true);
            }}
          >
            Delete my account
          </Button>
        </div>
      </Card>

      <Dialog
        open={confirming}
        title="Delete my account"
        onClose={() => setConfirming(false)}
        onSubmit={() => void removeAccount()}
        submitLabel="Delete it"
        danger
        busy={deleting}
        error={deleteError}
      >
        <p className="text-[16px] text-ink">
          Type DELETE to confirm. Your account, your sounds and your history go, and you are signed
          out.
        </p>
        <Field label="Type DELETE" htmlFor="confirm-delete">
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
          />
        </Field>
        {confirmText.trim().toUpperCase() !== 'DELETE' ? (
          <p className="text-[14px] text-muted">The button works once the word matches.</p>
        ) : null}
      </Dialog>
    </>
  );
}
