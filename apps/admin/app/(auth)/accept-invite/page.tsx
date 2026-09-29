import { SetPassword } from '@/components/forms/set-password';
export default function Page() {
  return <SetPassword endpoint="/auth/accept-invite" title="Welcome to the House" intro="Choose a password to finish setting up your account." />;
}
