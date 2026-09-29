import { SetPassword } from '@/components/forms/set-password';
export default function Page() {
  return <SetPassword endpoint="/auth/reset" title="Choose a new password" intro="This signs you out everywhere else." />;
}
