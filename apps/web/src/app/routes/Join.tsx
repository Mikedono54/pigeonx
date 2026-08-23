import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { acceptInvite } from '../lib/db';
import { useAuth } from '../AuthProvider';
import { errorMessage } from '../lib/errors';
import { Card } from '../components/ui';

/** `/app/join?token=…` — the last step of an invite, once the person is in. */
export default function Join() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { reloadBusinesses, chooseBusiness, email } = useAuth();
  const [error, setError] = useState<unknown>(null);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    if (!token) {
      setError(new Error('That invite link is missing its code. Ask for a new one.'));
      return;
    }
    void (async () => {
      try {
        const orgId = await acceptInvite(token);
        chooseBusiness(orgId);
        await reloadBusinesses();
        navigate('/app', { replace: true });
      } catch (err) {
        setError(err);
      }
    })();
  }, [token, navigate, chooseBusiness, reloadBusinesses]);

  return (
    <div className="mx-auto max-w-[34rem] py-10">
      {error ? (
        <Card>
          <h1 className="text-[1.5rem] font-semibold">This invite did not go through.</h1>
          <p className="mt-3 text-[16px] text-muted">{errorMessage(error)}</p>
          <p className="mt-3 text-[15px] text-muted">
            You are signed in as {email ?? 'this account'}. An invite only works for the address
            it was sent to.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex h-11 items-center border border-ink px-5 text-[15px] font-medium text-ink hover:bg-ink hover:text-bg"
          >
            Go to the dashboard
          </Link>
        </Card>
      ) : (
        <Card>
          <h1 className="text-[1.5rem] font-semibold">Adding you to the business.</h1>
          <p className="mt-3 text-[16px] text-muted">One moment.</p>
        </Card>
      )}
    </div>
  );
}
