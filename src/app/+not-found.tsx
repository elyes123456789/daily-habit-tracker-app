import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen title="Page not found">
      <EmptyState
        icon="compass"
        title="There is nothing at this address"
        body="The link may be mistyped, or it may point to something that only exists on another device."
        action={<Button label="Go to Today" variant="primary" onPress={() => router.replace('/')} />}
      />
    </Screen>
  );
}
