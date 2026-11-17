import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useSaveHub } from '@/api/hooks';
import { HubForm } from '@/components/HubForm';
import { Screen, showError, useToast } from '@/components/ui';
import { fieldErrors } from '@/utils/errors';

export default function NewHubScreen() {
  const router = useRouter();
  const toast = useToast();
  const save = useSaveHub();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  return (
    <Screen>
      <HubForm
        submitting={save.isPending}
        serverErrors={serverErrors}
        onSubmit={async (input) => {
          setServerErrors({});
          try {
            await save.mutateAsync(input);
            toast.show('Hub added');
            router.back();
          } catch (e) {
            const fe = fieldErrors(e);
            // A duplicate name arrives as a 409 without field details.
            if (Object.keys(fe).length) setServerErrors(fe);
            else if ((e as { status?: number }).status === 409) setServerErrors({ name: 'A hub with this name already exists' });
            else showError(e, 'Could not add the hub');
          }
        }}
      />
    </Screen>
  );
}
